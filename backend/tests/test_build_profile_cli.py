from pathlib import Path

try:
    from backend.scripts.build_profile import build_profile_cli, prompt_interactive_questionnaire
    from backend.learner_profile import get_or_create_profile
except ModuleNotFoundError:
    from scripts.build_profile import build_profile_cli, prompt_interactive_questionnaire
    from learner_profile import get_or_create_profile


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
