import os
from pathlib import Path

from ai_service import ai_service


def test_ai_status_endpoint(client):
    res = client.get("/ai/status")
    assert res.status_code == 200
    data = res.json()
    assert "configured" in data
    assert "has_key" in data
    assert data["model"] == "gemini-3-flash-preview"


def test_ai_configure_key_endpoint(client, tmp_path, monkeypatch):
    dummy_env = tmp_path / ".env"
    dummy_env.write_text("SOME_VAR=123\n", encoding="utf-8")
    monkeypatch.setenv("ENV_FILE", str(dummy_env))
    monkeypatch.setenv("ALLOW_LOCAL_WELCOME", "true")

    res = client.post("/ai/configure-key", json={"api_key": "test-gemini-key-12345"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["saved_to_file"] is True

    # Check env file content
    content = dummy_env.read_text(encoding="utf-8")
    assert "GEMINI_API_KEY=test-gemini-key-12345" in content

    # Check ai_service in-memory configuration
    assert ai_service.is_configured is True

    # Check status endpoint reflects it
    status_res = client.get("/ai/status")
    assert status_res.status_code == 200
    assert status_res.json()["has_key"] is True


def test_ai_configure_key_empty(client, monkeypatch):
    monkeypatch.setenv("ALLOW_LOCAL_WELCOME", "true")
    res = client.post("/ai/configure-key", json={"api_key": "   "})
    assert res.status_code == 400
