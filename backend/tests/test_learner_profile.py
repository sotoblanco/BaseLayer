"""
Tests for LEARNING.md Learner Profile Management & Event Recording (Issue #23).
"""

from pathlib import Path
from unittest.mock import patch

from learner_profile import (
    LearnerQuestionnaire,
    aggregate_questionnaire_to_markdown,
    apply_questionnaire_profile,
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
            payload={
                "course_slug": "tinytorch",
                "lesson_slug": "chapter1--lesson02",
                "ui": "light",
            },
            base_dir=tmp_path,
        )

        assert parsed["frontmatter"]["preferred_ui"] == "light"
        assert any(
            "tinytorch" in line and "chapter1--lesson02" in line for line in parsed["courses_taken"]
        )

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
        assert any(
            "generated-numpy-intro" in b and "4 Solveit lessons" in b
            for b in parsed["courses_built"]
        )

    def test_record_tutor_level_changed_event(self, tmp_path: Path):
        get_or_create_profile("tutor_user", base_dir=tmp_path)

        record_learner_event(
            username="tutor_user",
            event_type="tutor_level_changed",
            payload={"tutor_style": "socratic", "understanding_level": "advanced"},
            base_dir=tmp_path,
        )

        _, parsed = get_or_create_profile("tutor_user", base_dir=tmp_path)
        assert parsed["frontmatter"]["tutor_style"] == "socratic"
        assert parsed["frontmatter"]["understanding_level"] == "advanced"


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

    def test_aggregate_questionnaire_to_markdown(self):
        answers = LearnerQuestionnaire(
            goal="Master tensor broadcasting and matrix multiplications",
            preferred_modalities=["spreadsheet", "drawing"],
            understanding_level="beginner",
            tutor_style="solveit",
            pace="unhurried",
            preferred_ui="light",
            custom_notes="Focus on visual matrix dimensions",
        )
        md = aggregate_questionnaire_to_markdown("visual_student", answers)
        fm, body = parse_frontmatter(md)

        assert fm["username"] == "visual_student"
        assert fm["understanding_level"] == "beginner"
        assert fm["preferred_modalities"] == ["spreadsheet", "drawing"]
        assert fm["tutor_style"] == "solveit"
        assert fm["pace"] == "unhurried"
        assert "Master tensor broadcasting" in body
        assert "Focus on visual matrix dimensions" in body
        assert "Offer spreadsheet cell formulas" in body
        assert "Include visual diagrams" in body

    def test_apply_questionnaire_profile_preserves_courses(self, tmp_path: Path):
        # 1. Create initial profile with some progress
        get_or_create_profile("active_student", base_dir=tmp_path)
        record_learner_event(
            username="active_student",
            event_type="lesson_opened",
            payload={"course_slug": "tinytorch", "lesson_slug": "tensor-ops", "ui": "light"},
            base_dir=tmp_path,
        )

        # 2. Re-run questionnaire with new preferences
        answers = LearnerQuestionnaire(
            goal="Build high performance CUDA kernels",
            preferred_modalities=["code"],
            understanding_level="advanced",
            tutor_style="direct",
            pace="sprint",
            preferred_ui="classic",
        )
        content, parsed = apply_questionnaire_profile("active_student", answers, base_dir=tmp_path)

        assert parsed["frontmatter"]["understanding_level"] == "advanced"
        assert parsed["frontmatter"]["tutor_style"] == "direct"
        assert parsed["frontmatter"]["preferred_ui"] == "classic"
        assert any("tinytorch" in line for line in parsed["courses_taken"])
        assert "Build high performance CUDA kernels" in content

    def test_submit_questionnaire_authenticated(self, client, auth_headers, tmp_path: Path):
        payload = {
            "goal": "Understand transformers from zero",
            "preferred_modalities": ["code", "spreadsheet"],
            "understanding_level": "intermediate",
            "tutor_style": "socratic",
            "pace": "unhurried",
            "preferred_ui": "light",
            "custom_notes": "Interested in self-attention weights",
        }
        with patch("learner_profile.get_learners_data_dir", return_value=tmp_path):
            response = client.post(
                "/me/learning-profile/questionnaire",
                json=payload,
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["parsed"]["frontmatter"]["tutor_style"] == "socratic"
        assert data["parsed"]["frontmatter"]["preferred_modalities"] == ["code", "spreadsheet"]
        assert "Understand transformers from zero" in data["markdown"]

    def test_simplified_diagnostic_inference_modalities_and_tutor(self):
        # Case 1: diagram + guiding question -> drawing+code, socratic
        q1 = LearnerQuestionnaire(
            intake_preference="diagram",
            hint_preference="guiding_question",
            explanation_length="short",
            exercise_format="micro_steps",
            pace="unhurried",
        )
        md1 = aggregate_questionnaire_to_markdown("diag_user", q1)
        fm1, body1 = parse_frontmatter(md1)
        assert fm1["tutor_style"] == "socratic"
        assert fm1["preferred_modalities"] == ["drawing", "code"]
        assert fm1["explanation_length"] == "short"
        assert fm1["exercise_format"] == "micro_steps"
        assert "concise essentials" in body1
        assert "bite-sized micro-steps" in body1

        # Case 2: table + direct explanation -> spreadsheet+code, direct
        q2 = LearnerQuestionnaire(
            intake_preference="table",
            hint_preference="direct_explanation",
            explanation_length="thorough",
            exercise_format="macro_challenges",
            pace="sprint",
        )
        md2 = aggregate_questionnaire_to_markdown("table_user", q2)
        fm2, body2 = parse_frontmatter(md2)
        assert fm2["tutor_style"] == "direct"
        assert fm2["preferred_modalities"] == ["spreadsheet", "code"]
        assert fm2["explanation_length"] == "thorough"
        assert fm2["exercise_format"] == "macro_challenges"
        assert "in-depth explanations" in body2
        assert "comprehensive challenges" in body2

        # Case 3: hands_on + toy example -> code, solveit
        q3 = LearnerQuestionnaire(
            intake_preference="hands_on",
            hint_preference="toy_example",
        )
        md3 = aggregate_questionnaire_to_markdown("code_user", q3)
        fm3, _ = parse_frontmatter(md3)
        assert fm3["tutor_style"] == "solveit"
        assert fm3["preferred_modalities"] == ["code"]

        # Case 4: story -> text+code
        q4 = LearnerQuestionnaire(
            intake_preference="story",
            tone="direct",
        )
        md4 = aggregate_questionnaire_to_markdown("story_user", q4)
        fm4, body4 = parse_frontmatter(md4)
        assert fm4["preferred_modalities"] == ["text", "code"]
        assert fm4["tone"] == "direct"
        assert "Direct technical manual style" in body4
        assert "Anti-AI style" in body4

        # Case 5: guided_completion explicitly selected
        q5 = LearnerQuestionnaire(
            intake_preference="hands_on",
            exercise_format="guided_completion",
        )
        md5 = aggregate_questionnaire_to_markdown("guided_user", q5)
        fm5, body5 = parse_frontmatter(md5)
        assert fm5["exercise_format"] == "guided_completion"
        assert "guided fill-in-the-blank code completion" in body5
        assert "fill-in-the-blank placeholders (`____`)" in body5

        # Case 6: beginner understanding level infers guided_completion if not set
        q6 = LearnerQuestionnaire(
            understanding_level="beginner",
        )
        md6 = aggregate_questionnaire_to_markdown("beginner_user", q6)
        fm6, body6 = parse_frontmatter(md6)
        assert fm6["exercise_format"] == "guided_completion"
        assert "guided fill-in-the-blank code completion" in body6

    def test_submit_questionnaire_with_simplified_diagnostic(
        self, client, auth_headers, tmp_path: Path
    ):
        payload = {
            "intake_preference": "diagram",
            "hint_preference": "guiding_question",
            "explanation_length": "short",
            "exercise_format": "micro_steps",
            "pace": "unhurried",
            "preferred_ui": "light",
            "tone": "pragmatic",
        }
        with patch("learner_profile.get_learners_data_dir", return_value=tmp_path):
            response = client.post(
                "/me/learning-profile/questionnaire",
                json=payload,
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.json()
        fm = data["parsed"]["frontmatter"]
        assert fm["tutor_style"] == "socratic"
        assert fm["preferred_modalities"] == ["drawing", "code"]
        assert fm["explanation_length"] == "short"
        assert fm["exercise_format"] == "micro_steps"
        assert fm["tone"] == "pragmatic"

        # Submit with guided_completion
        payload_guided = {
            "intake_preference": "hands_on",
            "exercise_format": "guided_completion",
            "understanding_level": "beginner",
        }
        with patch("learner_profile.get_learners_data_dir", return_value=tmp_path):
            response_guided = client.post(
                "/me/learning-profile/questionnaire",
                json=payload_guided,
                headers=auth_headers,
            )

        assert response_guided.status_code == 200
        data_guided = response_guided.json()
        fm_guided = data_guided["parsed"]["frontmatter"]
        assert fm_guided["exercise_format"] == "guided_completion"
        assert "guided fill-in-the-blank code completion" in data_guided["parsed"]["snapshot"]
