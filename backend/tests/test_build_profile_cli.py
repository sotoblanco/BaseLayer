from pathlib import Path

try:
    from backend.learner_profile import get_or_create_profile
    from backend.scripts.build_profile import (
        _upsert_env,
        build_profile_cli,
        prompt_interactive_questionnaire,
    )
except ModuleNotFoundError:
    from learner_profile import get_or_create_profile
    from scripts.build_profile import (
        _upsert_env,
        build_profile_cli,
        prompt_interactive_questionnaire,
    )


def test_build_profile_cli_non_interactive(tmp_path: Path):
    res = build_profile_cli(
        ["--username", "dev_alice", "--goal", "Master PyTorch", "--non-interactive"],
        base_dir=tmp_path,
    )
    assert res == 0
    markdown, parsed = get_or_create_profile("dev_alice", base_dir=tmp_path)
    assert parsed["frontmatter"]["username"] == "dev_alice"
    assert "Master PyTorch" in markdown
    assert parsed["frontmatter"]["preferred_modalities"] == ["code", "spreadsheet", "drawing"]


def test_build_profile_cli_with_overrides(tmp_path: Path):
    res = build_profile_cli(
        [
            "--username",
            "socratic_sam",
            "--tutor-style",
            "socratic",
            "--tone",
            "concise",
            "--modalities",
            "code",
            "spreadsheet",
            "--non-interactive",
        ],
        base_dir=tmp_path,
    )
    assert res == 0
    _, parsed = get_or_create_profile("socratic_sam", base_dir=tmp_path)
    assert parsed["frontmatter"]["tutor_style"] == "socratic"
    assert parsed["frontmatter"]["tone"] == "concise"
    assert parsed["frontmatter"]["preferred_modalities"] == ["code", "spreadsheet"]


def test_prompt_interactive_questionnaire_defaults(monkeypatch):
    # Simulate user pressing Enter on all prompts
    inputs = iter(["", "", "", "", "", ""])
    monkeypatch.setattr("builtins.input", lambda _="": next(inputs))

    username, answers = prompt_interactive_questionnaire(default_username="DefaultUser")
    assert username == "DefaultUser"
    assert answers.tutor_style == "solveit"
    assert answers.tone == "pragmatic"
    assert answers.preferred_modalities == ["code", "spreadsheet", "drawing"]


def test_prompt_interactive_questionnaire_custom_selections(monkeypatch):
    # Inputs:
    # 1: Username
    # 2: Goal
    # 3: Situation 1 option 2 (First principles)
    # 4: Situation 2 option 2 (Socratic)
    # 5: Situation 3 option 2 (Ultra-concise)
    # 6: Tool focus option 2 (Code)
    inputs = iter(["CustomBob", "Master CUDA", "2", "2", "2", "2"])
    monkeypatch.setattr("builtins.input", lambda _="": next(inputs))

    username, answers = prompt_interactive_questionnaire()
    assert username == "CustomBob"
    assert answers.goal == "Master CUDA"
    assert answers.tutor_style == "socratic"
    assert answers.tone == "concise"
    assert answers.preferred_modalities == ["code"]


def test_onboard_non_interactive_builds_full_workspace(tmp_path: Path):
    ws = tmp_path / "ws"
    res = build_profile_cli(
        [
            "--onboard",
            "--non-interactive",
            "--username",
            "onb_ada",
            "--provider",
            "gemini",
            "--api-key",
            "test-key-xyz",
            "--instructor-style",
            "socratic",
        ],
        base_dir=ws,
    )
    assert res == 0
    assert (ws / "config.json").is_file()
    assert (ws / "MEMORY.md").is_file()
    assert (ws / "courses").is_dir()
    assert (ws / "data" / "learners" / "onb_ada" / "LEARNING.md").is_file()

    instructor = (ws / "INSTRUCTOR.md").read_text(encoding="utf-8")
    assert "tutor_style: socratic" in instructor
    assert "modality_order:" in instructor

    env = (ws / ".env").read_text(encoding="utf-8")
    assert "LLM_PROVIDER=gemini" in env
    assert "LLM_API_KEY=test-key-xyz" in env


def test_onboard_skip_ai_writes_no_keys(tmp_path: Path):
    ws = tmp_path / "ws"
    res = build_profile_cli(
        ["--onboard", "--non-interactive", "--username", "onb_bob", "--skip-ai"],
        base_dir=ws,
    )
    assert res == 0
    assert (ws / "INSTRUCTOR.md").is_file()
    assert (ws / "data" / "learners" / "onb_bob" / "LEARNING.md").is_file()
    env = (ws / ".env").read_text(encoding="utf-8")
    assert "LLM_PROVIDER" not in env


def test_onboard_unknown_provider_saved_nothing(tmp_path: Path):
    ws = tmp_path / "ws"
    res = build_profile_cli(
        ["--onboard", "--non-interactive", "--provider", "bogus"],
        base_dir=ws,
    )
    assert res == 0
    env = (ws / ".env").read_text(encoding="utf-8")
    assert "LLM_PROVIDER" not in env


def test_upsert_env_replaces_keys(tmp_path: Path):
    env = tmp_path / ".env"
    env.write_text("LLM_PROVIDER=ollama\nOTHER=1\n", encoding="utf-8")
    _upsert_env(env, {"LLM_PROVIDER": "gemini", "LLM_API_KEY": "k"})
    content = env.read_text(encoding="utf-8")
    assert "LLM_PROVIDER=gemini" in content
    assert "LLM_PROVIDER=ollama" not in content
    assert "OTHER=1" in content
    assert "LLM_API_KEY=k" in content
