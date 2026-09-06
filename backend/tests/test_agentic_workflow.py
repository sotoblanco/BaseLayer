"""
Tests for the 4-step Agentic Course Workflow and Tool Calls:
1. get_learning_intent
2. get_context_learning
3. get_platform_content_tools
4. curate_solveit_course
And end-to-end materialization into BaseLayer.
"""

import json
from pathlib import Path
from unittest.mock import patch

from agentic_tools import (
    curate_solveit_course,
    get_context_learning,
    get_learning_intent,
    get_platform_content_tools,
)
from agentic_workflow import AgenticCourseWorkflow
from routers.file_courses import parse_course


class TestTool1LearningIntent:
    def test_extracts_concepts_and_goals_from_topic(self, tmp_path: Path):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        course = courses_dir / "tinytorch" / "chapter1" / "lesson02"
        course.mkdir(parents=True)
        (course / "README.md").write_text("NumPy tensors, shapes and arrays.", encoding="utf-8")

        result = get_learning_intent(
            topic="Learn NumPy array shapes and tensor broadcasting",
            materials="Here is a snippet:\n```python\nimport numpy as np\na = np.zeros((2, 3))\n```",
            courses_dir=courses_dir,
        )

        assert "numpy" in [c.lower() for c in result.target_concepts]
        assert len(result.learning_goals) >= 2
        assert len(result.extracted_snippets) >= 1
        assert "np.zeros" in result.extracted_snippets[0]
        assert len(result.related_platform_courses) >= 1


class TestTool2ContextLearning:
    def test_returns_adaptive_default_for_unprofiled_learner(self, tmp_path: Path):
        data_dir = tmp_path / "data"
        result = get_context_learning(username="newbie_coder", data_dir=data_dir)

        assert result.username == "newbie_coder"
        assert result.has_stored_profile is False
        assert "code" in result.preferred_modalities
        assert result.tutor_style == "solveit"
        assert "Solveit micro-step" in result.personalization_guidance

    def test_parses_existing_learning_profile(self, tmp_path: Path):
        data_dir = tmp_path / "data"
        user_dir = data_dir / "learners" / "alex"
        user_dir.mkdir(parents=True)

        profile_content = """---
understanding_level: Advanced
tutor_style: solveit
pace: unhurried
preferred_modalities:
  - spreadsheet
  - drawing
  - code
---

# Learning profile — alex
## Courses taken
- **tinytorch** — chapter 1
"""
        (user_dir / "LEARNING.md").write_text(profile_content, encoding="utf-8")

        result = get_context_learning(username="alex", data_dir=data_dir)

        assert result.has_stored_profile is True
        assert result.understanding_level == "Advanced"
        assert result.pace == "unhurried"
        assert result.tone == "pragmatic"
        assert "spreadsheet" in result.preferred_modalities
        assert "drawing" in result.preferred_modalities
        assert "tinytorch" in result.prior_courses

    def test_parses_tone_and_anti_ai_guidance(self, tmp_path: Path):
        data_dir = tmp_path / "data"
        user_dir = data_dir / "learners" / "dev"
        user_dir.mkdir(parents=True)

        profile_content = """---
understanding_level: Intermediate
tutor_style: solveit
tone: direct
pace: sprint
preferred_modalities:
  - code
---
"""
        (user_dir / "LEARNING.md").write_text(profile_content, encoding="utf-8")
        result = get_context_learning(username="dev", data_dir=data_dir)
        assert result.tone == "direct"
        assert "Direct technical manual style" in result.personalization_guidance
        assert "Ban AI tropes" in result.personalization_guidance


class TestTool3PlatformContentTools:
    def test_returns_modalities_and_installed_libraries(self):
        tools = get_platform_content_tools()

        assert "code" in tools.modalities
        assert "spreadsheet" in tools.modalities
        assert "drawing" in tools.modalities

        # Installed sandbox libs
        assert "numpy" in tools.installed_sandbox_libraries
        assert "torch" in tools.installed_sandbox_libraries
        assert "matplotlib" in tools.installed_sandbox_libraries

        # Guidelines
        assert len(tools.pedagogical_guidelines) >= 3


class TestTool4CurateSolveitCourse:
    def test_enforces_solveit_directives_and_validates_python(self):
        raw_lessons = [
            {
                "title": "Minimal Vector",
                "modality": "code",
                "objective": "Create a 3-element vector",
                "toy_data": "[1, 2, 3]",
                "expected_result": "3",
                "micro_task": "Write create_vec() in 1 line",
                "inspect_prompt": "What does len(create_vec()) print?",
                "curiosity_prompt": "Can we vectorize this?",
                "starter_code": "def create_vec():\n    pass\n",
                "test_code": "from main import create_vec\nassert create_vec() == [1, 2, 3]\n",
                "solution_code": "def create_vec():\n    return [1, 2, 3]\n",
            },
            {
                "title": "Spreadsheet Math",
                "modality": "spreadsheet",
                "objective": "Observe matrix doubling",
                "toy_data": "[[1, 2], [3, 4]]",
                "expected_result": "[[2, 4], [6, 8]]",
                "micro_task": "Enter =ARRAYFORMULA(A1:B2 * 2)",
                "inspect_prompt": "Check cell C1",
                "curiosity_prompt": "How does ARRAYFORMULA work?",
                "google_sheet_id": "test_sheet_123",
                "copy_on_open": True,
            },
        ]

        curated = curate_solveit_course(
            course_title="NumPy Primitives",
            course_description="Master primitives in micro-steps.",
            narrative_arc="From scalar toy data to vector operations.",
            lessons=raw_lessons,
        )

        assert curated.slug == "generated-numpy-primitives"
        assert curated.lesson_count == 2
        assert curated.solveit_compliance["micro_steps_enforced"] is True
        assert curated.solveit_compliance["toy_data_grounded"] is True
        assert curated.solveit_compliance["immediate_inspection_present"] is True
        assert curated.solveit_compliance["curiosity_loop_active"] is True
        assert curated.lessons[0].modality == "code"
        assert curated.lessons[1].modality == "spreadsheet"


class TestAgenticWorkflowExecution:
    def test_end_to_end_agentic_workflow_records_all_traces_and_materializes(
        self, tmp_path: Path, monkeypatch
    ):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        workflow = AgenticCourseWorkflow(courses_dir=courses_dir, data_dir=tmp_path / "data")
        result = workflow.execute(
            topic="Tensor Math and Broadcasting",
            materials="import numpy as np\na = np.array([1, 2])",
            username="alex",
        )

        # Verify all 4 required tool calls are tracked in tool_traces
        trace_names = [t.tool_name for t in result.tool_traces]
        assert "get_learning_intent" in trace_names
        assert "get_context_learning" in trace_names
        assert "get_platform_content_tools" in trace_names
        assert "curate_solveit_course" in trace_names
        assert "materialize_course" in trace_names

        # Verify filesystem course matches BaseLayer course structure
        course_dir = courses_dir / result.slug
        assert (course_dir / "README.md").is_file()
        assert (course_dir / "chapter1" / "lesson01" / "README.md").is_file()
        assert (course_dir / "chapter1" / "lesson01" / "metadata.json").is_file()
        assert (course_dir / "metadata.json").is_file()

        lesson_meta = json.loads(
            (course_dir / "chapter1" / "lesson01" / "metadata.json").read_text()
        )
        course_meta = json.loads((course_dir / "metadata.json").read_text())
        assert "skills" in lesson_meta
        assert course_meta.get("title")
        assert isinstance(course_meta.get("skills"), list)

        # Check that parse_course in file_courses router parses it successfully!
        parsed = parse_course(result.slug)
        assert parsed is not None
        assert parsed.slug == result.slug
        assert len(parsed.lessons) == result.lesson_count
        assert parsed.lessons[0].slug.startswith("chapter1--lesson")

    def test_fastapi_build_endpoint_uses_agentic_workflow(
        self, client, auth_headers, tmp_path: Path, monkeypatch
    ):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        with patch("routers.ai.COURSES_DIR", courses_dir):
            response = client.post(
                "/ai/learning-path/build",
                json={
                    "topic": "Vector Calculus and Gradient Steps",
                    "resources": [{"kind": "paste", "name": "notes", "text": "grad = [0.1, 0.2]"}],
                },
                headers=auth_headers,
            )

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["slug"].startswith("generated-")
        assert data["lesson_count"] >= 2
        assert "tool_traces" in data
        assert len(data["tool_traces"]) >= 4
        tools_called = [t["tool_name"] for t in data["tool_traces"]]
        assert "get_learning_intent" in tools_called
        assert "get_context_learning" in tools_called
        assert "get_platform_content_tools" in tools_called
        assert "curate_solveit_course" in tools_called
