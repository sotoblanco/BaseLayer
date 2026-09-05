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
