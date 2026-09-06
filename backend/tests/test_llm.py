from llm import load_settings, validate_settings


def _clear_llm_env(monkeypatch):
    for key in (
        "LLM_PROVIDER",
        "LLM_API_KEY",
        "LLM_MODEL",
        "LLM_API_BASE",
        "OPENAI_API_KEY",
        "OPENAI_BASE_URL",
        "GEMINI_API_KEY",
    ):
        monkeypatch.delenv(key, raising=False)


def test_unconfigured_without_env(monkeypatch):
    _clear_llm_env(monkeypatch)
    settings = load_settings()
    assert settings.provider == ""
    assert settings.is_configured is False


def test_openai_alias_from_openai_api_key(monkeypatch):
    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    settings = load_settings()
    assert settings.provider == "openai"
    assert settings.is_configured is True


def test_ollama_does_not_need_a_key(monkeypatch):
    _clear_llm_env(monkeypatch)
    monkeypatch.setenv("LLM_PROVIDER", "ollama")
    settings = load_settings()
    assert settings.is_configured is True
    assert settings.has_key is False
    assert settings.effective_base() == "http://localhost:11434/v1"


def test_validate_openai_requires_key():
    try:
        validate_settings("openai", api_key="")
        raise AssertionError("expected ValueError")
    except ValueError as exc:
        assert "API key" in str(exc)
