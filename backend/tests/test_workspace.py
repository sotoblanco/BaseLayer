"""Tests for local workspace integration (backend/workspace.py + wiring)."""

import json
import os
from pathlib import Path

import pytest

try:
    from backend import workspace
    from backend.agentic_tools import get_context_learning
    from backend.learner_profile import get_or_create_profile, record_learner_event
    from backend.llm import load_settings
    from backend.routers import ai as ai_mod
    from backend.routers import file_courses as file_courses_mod
    from backend.routers.ai import _generated_courses_dir
    from backend.routers.file_courses import _find_courses_dir
except ModuleNotFoundError:
    import workspace
    from agentic_tools import get_context_learning
    from learner_profile import get_or_create_profile, record_learner_event
    from llm import load_settings
    from routers import ai as ai_mod
    from routers import file_courses as file_courses_mod
    from routers.ai import _generated_courses_dir
    from routers.file_courses import _find_courses_dir


def _course(root: Path, slug: str, title: str) -> Path:
    course = root / slug
    lesson = course / "chapter1" / "lesson01"
    lesson.mkdir(parents=True)
    (course / "metadata.json").write_text(json.dumps({"title": title}), encoding="utf-8")
    (course / "README.md").write_text(f"# {title}\n", encoding="utf-8")
    (lesson / "README.md").write_text("# Topic: T\n\n## Objective\nO\n", encoding="utf-8")
    (lesson / "metadata.json").write_text(json.dumps({"exercise_type": "code"}), encoding="utf-8")
    (lesson / "main.py").write_text("x = 1\n", encoding="utf-8")
    (lesson / "test.py").write_text("from main import x\nassert x == 1\n", encoding="utf-8")
    (lesson / "solution.py").write_text("x = 1\n", encoding="utf-8")
    return course


def _ws(tmp_path: Path, env_lines: str = "LLM_PROVIDER=gemini\nLLM_API_KEY=k\n") -> Path:
    ws = tmp_path / "ws"
    (ws / "data" / "learners").mkdir(parents=True)
    (ws / "courses").mkdir(parents=True)
    (ws / ".env").write_text(env_lines, encoding="utf-8")
    (ws / "config.json").write_text(json.dumps({"version": 1}), encoding="utf-8")
    return ws


@pytest.fixture
def live_workspace(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    """Disable the conftest hermetic flag and point at a scratch workspace."""
    monkeypatch.setenv("BASELAYER_IGNORE_WORKSPACE", "0")
    ws = _ws(tmp_path)
    monkeypatch.setenv("BASELAYER_WORKSPACE", str(ws))
    for var in (
        "LLM_PROVIDER",
        "LLM_MODEL",
        "LLM_API_KEY",
        "LLM_API_BASE",
        "GEMINI_API_KEY",
        "OPENAI_API_KEY",
        "LEARNERS_DATA_DIR",
        "BASELAYER_COURSES_DIR",
    ):
        monkeypatch.delenv(var, raising=False)
    return ws


class TestWorkspaceRoot:
    def test_explicit_wins(self, tmp_path: Path):
        assert workspace.workspace_root(str(tmp_path)) == tmp_path

    def test_missing_default_is_none(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
        monkeypatch.setenv("HOME", str(tmp_path))
        monkeypatch.delenv("BASELAYER_WORKSPACE", raising=False)
        assert workspace.workspace_root() is None

    def test_ignore_flag_kills_ambient_only(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
        ws = _ws(tmp_path)
        monkeypatch.setenv("HOME", str(tmp_path))
        monkeypatch.setenv("BASELAYER_IGNORE_WORKSPACE", "1")
        # Ambient ~/.baselayer discovery is off...
        (tmp_path / ".baselayer" / "config.json").parent.mkdir(parents=True)
        (tmp_path / ".baselayer" / "config.json").write_text("{}", encoding="utf-8")
        monkeypatch.delenv("BASELAYER_WORKSPACE", raising=False)
        assert workspace.workspace_root() is None
        # ...but deliberate configuration still works.
        monkeypatch.setenv("BASELAYER_WORKSPACE", str(ws))
        assert workspace.workspace_root() == ws


class TestDotenv:
    def test_parses_quotes_exports_comments(self, tmp_path: Path):
        env = tmp_path / ".env"
        env.write_text(
            "# comment\n"
            "export LLM_PROVIDER=gemini\n"
            'LLM_MODEL="gemini-flash"\n'
            "LLM_API_KEY='k 123'\n"
            "EMPTY=\n"
            "NOT_A_PAIR\n"
            "9BAD=oops\n",
            encoding="utf-8",
        )
        parsed = workspace.parse_dotenv_file(env)
        assert parsed["LLM_PROVIDER"] == "gemini"
        assert parsed["LLM_MODEL"] == "gemini-flash"
        assert parsed["LLM_API_KEY"] == "k 123"
        assert parsed["EMPTY"] == ""
        assert "NOT_A_PAIR" not in parsed
        assert "9BAD" not in parsed

    def test_missing_file_is_empty(self, tmp_path: Path):
        assert workspace.parse_dotenv_file(tmp_path / "nope.env") == {}


class TestApplyWorkspaceEnv:
    def test_sethdefault_never_overrides(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
        ws = _ws(tmp_path, "LLM_PROVIDER=gemini\nLLM_API_KEY=ws-key\n")
        monkeypatch.setenv("BASELAYER_IGNORE_WORKSPACE", "0")
        monkeypatch.setenv("LLM_PROVIDER", "repo-provider")
        monkeypatch.delenv("LLM_API_KEY", raising=False)
        monkeypatch.delenv("LEARNERS_DATA_DIR", raising=False)
        assert workspace.apply_workspace_env(str(ws)) == ws
        assert os.environ["LLM_PROVIDER"] == "repo-provider"
        assert os.environ["LLM_API_KEY"] == "ws-key"
        assert os.environ["LEARNERS_DATA_DIR"] == str(ws / "data" / "learners")

    def test_no_workspace_is_noop(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
        monkeypatch.setenv("HOME", str(tmp_path))
        monkeypatch.delenv("BASELAYER_WORKSPACE", raising=False)
        assert workspace.apply_workspace_env() is None


class TestInstructorDefaults:
    def test_parses_frontmatter(self, live_workspace: Path):
        (live_workspace / "INSTRUCTOR.md").write_text(
            "---\ntutor_style: direct\ntone: concise\n# comment\n"
            "modality_order:\n  - code\n  - drawing\n---\n\n# Body\n",
            encoding="utf-8",
        )
        defaults = workspace.get_instructor_defaults()
        assert defaults["tutor_style"] == "direct"
        assert defaults["tone"] == "concise"
        assert defaults["modality_order"] == ["code", "drawing"]

    def test_missing_file_is_empty(self, live_workspace: Path):
        assert workspace.get_instructor_defaults() == {}

    def test_default_context_honors_instructor(self, live_workspace: Path, tmp_path: Path):
        (live_workspace / "INSTRUCTOR.md").write_text(
            "---\ntutor_style: socratic\ntone: direct\npace: sprint\n"
            "exercise_format: guided_completion\nmodality_order:\n  - drawing\n---\n",
            encoding="utf-8",
        )
        ctx = get_context_learning(username="ghost", data_dir=tmp_path / "data")
        assert ctx.has_stored_profile is False
        assert ctx.tutor_style == "socratic"
        assert ctx.tone == "direct"
        assert ctx.pace == "sprint"
        assert ctx.exercise_format == "guided_completion"
        assert ctx.preferred_modalities == ["drawing"]
        assert "INSTRUCTOR.md" in ctx.personalization_guidance


class TestMemoryProgress:
    def test_creates_appends_replaces(self, live_workspace: Path):
        mem = live_workspace / "MEMORY.md"
        workspace.record_memory_progress("c1", "authored 'X' (3 lessons)")
        assert "- **c1** — authored 'X' (3 lessons)" in mem.read_text(encoding="utf-8")
        workspace.record_memory_progress("c2", "in progress")
        workspace.record_memory_progress("c1", "in progress — passed l01")
        content = mem.read_text(encoding="utf-8")
        assert content.count("- **c1**") == 1
        assert "passed l01" in content
        assert "- **c2**" in content

    def test_event_mirror(self, live_workspace: Path, tmp_path: Path):
        learners = tmp_path / "mirror-learners"
        learners.mkdir()
        get_or_create_profile("mem_ada", base_dir=learners)
        record_learner_event(
            username="mem_ada",
            event_type="course_authored",
            payload={"course_slug": " Tinytorch-X ".strip(), "title": "T", "lesson_count": 4},
            base_dir=learners,
        )
        mem = (live_workspace / "MEMORY.md").read_text(encoding="utf-8")
        assert "- **Tinytorch-X**" in mem


class TestSettingsAndCourses:
    def test_load_settings_reads_workspace(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
        ws = _ws(tmp_path, "LLM_PROVIDER=groq\nLLM_API_KEY=gk\nLLM_MODEL=llama\n")
        monkeypatch.setenv("BASELAYER_IGNORE_WORKSPACE", "0")
        monkeypatch.setenv("BASELAYER_WORKSPACE", str(ws))
        for var in (
            "LLM_PROVIDER",
            "LLM_MODEL",
            "LLM_API_KEY",
            "LLM_API_BASE",
            "GEMINI_API_KEY",
            "OPENAI_API_KEY",
        ):
            monkeypatch.delenv(var, raising=False)
        settings = load_settings()
        assert settings.provider == "groq"
        assert settings.model == "llama"

    def test_courses_dir_honors_workspace_override(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ):
        target = tmp_path / "my-courses"
        target.mkdir()
        monkeypatch.setenv("BASELAYER_COURSES_DIR", str(target))
        monkeypatch.delenv("COURSES_DIR", raising=False)
        assert _find_courses_dir() == target


class TestUnionCatalog:
    @pytest.fixture
    def catalog(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path, live_workspace: Path
    ) -> tuple[Path, Path]:
        repo = tmp_path / "repo-courses"
        repo.mkdir()
        monkeypatch.setattr(file_courses_mod, "COURSES_DIR", repo)
        file_courses_mod.clear_course_summary_cache()
        return live_workspace / "courses", repo

    def test_lists_both_roots(self, catalog: tuple[Path, Path]):
        ws_courses, repo = catalog
        _course(ws_courses, "ws-alpha", "Workspace Alpha")
        _course(repo, "repo-beta", "Repo Beta")
        slugs = {s.slug for s in file_courses_mod.list_file_courses()}
        assert {"ws-alpha", "repo-beta"} <= slugs

    def test_workspace_wins_slug_collision(self, catalog: Path):
        ws_courses, repo = catalog
        _course(ws_courses, "dupe", "Workspace Dupe")
        _course(repo, "dupe", "Repo Dupe")
        listed = [s for s in file_courses_mod.list_file_courses() if s.slug == "dupe"]
        assert len(listed) == 1
        assert listed[0].title == "Workspace Dupe"
        parsed = file_courses_mod.parse_course("dupe")
        assert parsed is not None and parsed.title == "Workspace Dupe"

    def test_imports_land_in_workspace(self, catalog: tuple[Path, Path]):
        ws_courses, _ = catalog
        slug, target = file_courses_mod._pick_safe_import_course_dir("fresh")
        assert slug == "fresh"
        assert target.parent == ws_courses

    def test_generated_dir_helper(self, catalog: tuple[Path, Path], monkeypatch, tmp_path: Path):
        ws_courses, repo = catalog
        assert _generated_courses_dir() == ws_courses
        monkeypatch.delenv("BASELAYER_WORKSPACE")
        monkeypatch.setenv("HOME", str(tmp_path))
        monkeypatch.setattr(ai_mod, "COURSES_DIR", repo)
        assert _generated_courses_dir() == repo
