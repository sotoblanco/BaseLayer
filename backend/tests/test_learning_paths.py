from pathlib import Path
from unittest.mock import patch

from learning_paths import LearningPath, LearningPathLesson, build_context, write_learning_path


def sample_path() -> LearningPath:
    return LearningPath(
        title="NumPy by building",
        description="Learn arrays through tiny experiments.",
        lessons=[
            LearningPathLesson(
                title="Create a tiny array",
                objective="Create an array and inspect its shape.",
                toy_data="[1, 2, 3]",
                expected_result="(3,)",
                micro_task="Write one line that creates the array.",
                inspect_prompt="What does array.shape print?",
                starter_code="import numpy as np\n\narray = None\n",
                test_code="from main import array\n\nassert array.shape == (3,)\n",
                solution_code="import numpy as np\n\narray = np.array([1, 2, 3])\n",
                source_refs=["platform sandbox:numpy"],
            )
        ],
    )


def test_build_context_supports_topic_only_and_platform_sources(tmp_path: Path):
    courses = tmp_path / "courses"
    lesson = courses / "tinytorch" / "chapter1" / "lesson01"
    lesson.mkdir(parents=True)
    (lesson / "README.md").write_text("Learn NumPy arrays and shape.", encoding="utf-8")

    context = build_context("numpy", [], courses)

    assert "numpy" in context.lower()
    assert "tinytorch/chapter1/lesson01/README.md" in context
    assert "LEARNER-PROVIDED MATERIAL: none" in context


def test_write_learning_path_creates_player_compatible_course(tmp_path: Path):
    slug = write_learning_path(sample_path(), tmp_path, "I want to learn numpy")
    lesson = tmp_path / slug / "chapter1" / "lesson01"

    assert slug == "generated-i-want-to-learn-numpy"
    assert (tmp_path / slug / "README.md").exists()
    assert "Toy data" in (lesson / "README.md").read_text(encoding="utf-8")
    assert (lesson / "main.py").read_text(encoding="utf-8").startswith("import numpy")
    assert (lesson / "test.py").exists()
    assert (lesson / "solution.py").exists()


def test_build_course_endpoint_writes_generated_course(client, auth_headers, tmp_path: Path):
    path = sample_path()
    with (
        patch("routers.ai.COURSES_DIR", tmp_path),
        patch("routers.ai.ai_service.plan_learning_path", return_value=path),
    ):
        response = client.post(
            "/ai/learning-path/build",
            json={
                "topic": "I want to learn numpy",
                "resources": [{"kind": "paste", "name": "notes", "text": "arrays"}],
            },
            headers=auth_headers,
        )

    assert response.status_code == 200, response.text
    assert response.json()["slug"].startswith("generated-i-want-to-learn-numpy")
    assert response.json()["lesson_count"] >= 1
