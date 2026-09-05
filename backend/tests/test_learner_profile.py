"""
Tests for LEARNING.md Learner Profile Management & Event Recording (Issue #23).
"""

from pathlib import Path
from unittest.mock import patch

from learner_profile import (
    get_or_create_profile,
    parse_frontmatter,
    record_learner_event,
    update_profile_markdown,
)


class TestLearnerProfileManager:
    def test_creates_default_profile_on_first_access(self, tmp_path: Path):
        content, parsed = get_or_create_profile("test_user", base_dir=tmp_path)

        assert "username: test_user" in content
        assert "preferred_ui: light" in content
        assert "tutor_style: solveit" in content
        assert parsed["frontmatter"]["username"] == "test_user"
        assert parsed["frontmatter"]["understanding_level"] == "intermediate"
        assert (tmp_path / "test_user" / "LEARNING.md").is_file()

    def test_parse_frontmatter_and_sections(self):
        sample = """---
username: alex
updated_at: 2026-09-05T18:00:00Z
version: 1
preferred_ui: classic
tutor_style: socratic
understanding_level: advanced
preferred_modalities:
  - spreadsheet
  - code
pace: sprint
---

# Learning profile — alex

## Snapshot
Custom snapshot text.

## Courses taken
- **tinytorch** — lesson 01 (completed).
"""
        fm, body = parse_frontmatter(sample)
        assert fm["username"] == "alex"
        assert fm["preferred_ui"] == "classic"
        assert fm["tutor_style"] == "socratic"
        assert fm["understanding_level"] == "advanced"
        assert fm["preferred_modalities"] == ["spreadsheet", "code"]
        assert fm["pace"] == "sprint"
        assert "Snapshot" in body

    def test_update_profile_markdown_validates_and_saves(self, tmp_path: Path):
        get_or_create_profile("editor_user", base_dir=tmp_path)

        updated_md = """---
username: editor_user
updated_at: 2026-09-05T19:00:00Z
version: 1
preferred_ui: light
tutor_style: solveit
understanding_level: beginner
preferred_modalities:
  - code
  - drawing
pace: unhurried
---

# Learning profile — editor_user

## Snapshot
I prefer visual and drawing warm-ups before jumping to code.

## Courses taken

## Courses built

## Signals

## Customize next
"""
        content, parsed = update_profile_markdown("editor_user", updated_md, base_dir=tmp_path)
        assert parsed["frontmatter"]["understanding_level"] == "beginner"
        assert parsed["frontmatter"]["preferred_modalities"] == ["code", "drawing"]
        assert "visual and drawing warm-ups" in parsed["snapshot"]

    def test_record_lesson_opened_event(self, tmp_path: Path):
        get_or_create_profile("student1", base_dir=tmp_path)

        parsed = record_learner_event(
            username="student1",
            event_type="lesson_opened",
            payload={"course_slug": "tinytorch", "lesson_slug": "chapter1--lesson02", "ui": "light"},
            base_dir=tmp_path,
        )

        assert parsed["frontmatter"]["preferred_ui"] == "light"
        assert any("tinytorch" in line and "chapter1--lesson02" in line for line in parsed["courses_taken"])

    def test_record_run_and_retry_signals(self, tmp_path: Path):
        get_or_create_profile("coder1", base_dir=tmp_path)

        # Failed submit records struggle/retry signal
        record_learner_event(
            username="coder1",
            event_type="run_result",
            payload={
                "course_slug": "tinytorch",
                "lesson_slug": "lesson02",
                "success": False,
                "is_submit": True,
                "language": "python",
            },
            base_dir=tmp_path,
        )

        _, parsed = get_or_create_profile("coder1", base_dir=tmp_path)
        assert any("Retrying test assertion" in s and "tinytorch" in s for s in parsed["signals"])

        # Successful submit records completion signal
        record_learner_event(
            username="coder1",
            event_type="run_result",
            payload={
                "course_slug": "tinytorch",
                "lesson_slug": "lesson02",
                "success": True,
                "is_submit": True,
                "language": "python",
            },
            base_dir=tmp_path,
        )

        _, parsed2 = get_or_create_profile("coder1", base_dir=tmp_path)
        assert any("Completed tinytorch" in s for s in parsed2["signals"])

    def test_record_course_authored_event(self, tmp_path: Path):
        get_or_create_profile("author1", base_dir=tmp_path)

        record_learner_event(
            username="author1",
            event_type="course_authored",
            payload={
                "course_slug": "generated-numpy-intro",
                "title": "NumPy Intro",
                "lesson_count": 4,
            },
            base_dir=tmp_path,
        )

        _, parsed = get_or_create_profile("author1", base_dir=tmp_path)
        assert any("generated-numpy-intro" in b and "4 Solveit lessons" in b for b in parsed["courses_built"])


class TestLearnerProfileAPI:
    def test_get_learning_profile_requires_auth(self, client):
        response = client.get("/me/learning-profile")
        assert response.status_code == 401

    def test_get_learning_profile_authenticated(self, client, auth_headers, tmp_path: Path):
        with patch("learner_profile.get_learners_data_dir", return_value=tmp_path):
            response = client.get("/me/learning-profile", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "markdown" in data
        assert "parsed" in data
        assert data["parsed"]["frontmatter"]["username"] == "testuser"

    def test_put_learning_profile_authenticated(self, client, auth_headers, tmp_path: Path):
        valid_md = """---
username: testuser
updated_at: 2026-09-05T20:00:00Z
version: 1
preferred_ui: light
tutor_style: solveit
understanding_level: advanced
preferred_modalities:
  - code
pace: sprint
---

# Learning profile — testuser

## Snapshot
Advanced test runner.
"""
        with patch("learner_profile.get_learners_data_dir", return_value=tmp_path):
            response = client.put(
                "/me/learning-profile",
                json={"markdown": valid_md},
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["parsed"]["frontmatter"]["understanding_level"] == "advanced"
        assert data["parsed"]["frontmatter"]["pace"] == "sprint"

    def test_post_event_authenticated(self, client, auth_headers, tmp_path: Path):
        with patch("learner_profile.get_learners_data_dir", return_value=tmp_path):
            response = client.post(
                "/me/learning-profile/events",
                json={
                    "event_type": "reset",
                    "payload": {"course_slug": "tinytorch", "lesson_slug": "lesson01"},
                },
                headers=auth_headers,
            )

        assert response.status_code == 200
        assert response.json()["success"] is True
        signals = response.json()["profile"]["signals"]
        assert any("Reset exercise on tinytorch" in s for s in signals)
