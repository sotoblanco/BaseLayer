from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from run_limits import MAX_AI_MESSAGE_CHARS, enforce_ai_limits, reset_hits


@pytest.fixture(autouse=True)
def _clear_quota():
    reset_hits()
    yield
    reset_hits()


class TestEnforceAiLimits:
    def test_rejects_oversized_message(self):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            enforce_ai_limits("alice", "x" * (MAX_AI_MESSAGE_CHARS + 1))
        assert exc.value.status_code == 413

    def test_rate_limits_after_quota(self, monkeypatch):
        from fastapi import HTTPException

        import run_limits

        monkeypatch.setattr(run_limits, "AI_RATE_LIMIT", 2)
        enforce_ai_limits("alice", "hi")
        enforce_ai_limits("alice", "hi")
        with pytest.raises(HTTPException) as exc:
            enforce_ai_limits("alice", "hi")
        assert exc.value.status_code == 429


class TestDiscussEndpoint:
    def test_discuss_requires_auth(self, client: TestClient):
        response = client.post("/ai/discuss", json={"message": "help"})
        assert response.status_code == 401

    @patch("routers.ai.ai_service.chat", return_value="hint")
    def test_discuss_authenticated(self, mock_chat, client: TestClient, auth_headers):
        response = client.post(
            "/ai/discuss",
            json={"message": "help", "context": "lesson", "understanding_level": "Beginner"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["response"] == "hint"
        mock_chat.assert_called_once()

    def test_discuss_rejects_empty_message(self, client: TestClient, auth_headers):
        response = client.post("/ai/discuss", json={"message": ""}, headers=auth_headers)
        assert response.status_code == 422

    @patch("routers.ai.ai_service.chat", return_value="ok")
    def test_discuss_rate_limit(self, _mock, client: TestClient, auth_headers, monkeypatch):
        import run_limits

        monkeypatch.setattr(run_limits, "AI_RATE_LIMIT", 2)
        payload = {"message": "help"}
        assert client.post("/ai/discuss", json=payload, headers=auth_headers).status_code == 200
        assert client.post("/ai/discuss", json=payload, headers=auth_headers).status_code == 200
        third = client.post("/ai/discuss", json=payload, headers=auth_headers)
        assert third.status_code == 429


class TestDrawingRubricParsing:
    """Tests for the structured rubric parsing in ai_service."""

    def test_parse_drawing_result_structured(self):
        from ai_service import ai_service

        text = (
            'Here you go: {"passed": false, "score": 0.5, '
            '"message": "Layers right but labels missing.", '
            '"checks": [{"label": "Intent matches", "passed": true, "feedback": "ok"}, '
            '{"label": "No missing required elements", "passed": false, '
            '"feedback": "Add layer names"}]}'
        )
        result = ai_service._parse_drawing_result(text)
        assert result["passed"] is False
        assert result["score"] == 0.5
        assert result["message"] == "Layers right but labels missing."
        assert len(result["checks"]) == 2
        assert result["checks"][1]["label"] == "No missing required elements"
        assert result["checks"][1]["passed"] is False

    def test_parse_drawing_result_all_passing_means_passed(self):
        from ai_service import ai_service

        text = (
            '{"passed": true, "score": 0.9, "message": "Great", '
            '"checks": [{"label": "a", "passed": true}, {"label": "b", "passed": true}]}'
        )
        result = ai_service._parse_drawing_result(text)
        assert result["passed"] is True
        assert result["checks"][0]["feedback"] == ""

    def test_parse_drawing_result_nested_json_is_balanced(self):
        from ai_service import ai_service

        text = (
            '{"passed": false, "score": 0.0, "message": "no", '
            '"checks": [{"label": "a", "passed": false, "feedback": "x { y } z"}]}'
        )
        result = ai_service._parse_drawing_result(text)
        assert result["passed"] is False
        assert result["checks"][0]["feedback"] == "x { y } z"

    def test_parse_drawing_result_coerces_string_bools(self):
        from ai_service import ai_service

        text = (
            '{"passed": "false", "score": 0.0, "message": "nope", '
            '"checks": [{"label": "a", "passed": "true", "feedback": "ok"}, '
            '{"label": "b", "passed": "false", "feedback": ""}]}'
        )
        result = ai_service._parse_drawing_result(text)
        assert result["passed"] is False
        assert result["checks"][0]["passed"] is True
        assert result["checks"][1]["passed"] is False
        assert result["score"] == 0.0

    def test_parse_drawing_result_unparsable_falls_back_to_text(self):
        from ai_service import ai_service

        result = ai_service._parse_drawing_result("The sketch looks correct overall!")
        assert result["passed"] is True
        assert "correct" in result["message"]
        assert result["checks"] == []
