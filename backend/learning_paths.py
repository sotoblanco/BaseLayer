import ast
import json
import re
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

MAX_RESOURCE_CHARS = 8_000
MAX_CONTEXT_CHARS = 24_000
MAX_LESSONS = 8


class LearningResource(BaseModel):
    kind: str = "text"
    name: str = "learner notes"
    text: str = Field(..., max_length=MAX_RESOURCE_CHARS)


class LearningPathLesson(BaseModel):
    title: str
    objective: str
    toy_data: str
    expected_result: str
    micro_task: str
    inspect_prompt: str
    starter_code: str
    test_code: str
    solution_code: str
    source_refs: list[str] = Field(default_factory=list)


class LearningPath(BaseModel):
    title: str
    description: str
    lessons: list[LearningPathLesson] = Field(min_length=1, max_length=MAX_LESSONS)


def slugify_topic(topic: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")
    slug = slug[:48].strip("-") or "learning-path"
    return f"generated-{slug}"


def _read_course_context(courses_dir: Path, topic: str) -> str:
    keywords = set(re.findall(r"[a-z0-9]+", topic.lower()))
    candidates: list[tuple[int, Path]] = []
    if not courses_dir.exists():
        return ""

    for readme in courses_dir.glob("*/**/README.md"):
        try:
            text = readme.read_text(encoding="utf-8")
        except OSError:
            continue
        score = sum(word in text.lower() for word in keywords)
        if score:
            candidates.append((score, readme))

    selected = sorted(candidates, key=lambda item: item[0], reverse=True)[:4]
    excerpts = []
    for _, path in selected:
        text = path.read_text(encoding="utf-8")[:4_000]
        excerpts.append(f"SOURCE: {path.relative_to(courses_dir)}\n{text}")
    return "\n\n".join(excerpts)


def build_context(topic: str, resources: list[LearningResource], courses_dir: Path) -> str:
    parts = [
        "PLATFORM CAPABILITIES:",
        "- Generated lessons run as Python code in the existing sandbox.",
        "- Installed learning libraries are numpy, torch, and matplotlib.",
        "- Existing exercises support code, Google Sheets, and drawing, but this first builder publishes verified code lessons.",
        "- Every lesson must be a Solveit micro-step: toy data, expected result, 1-3 line task, immediate inspection, and one question.",
    ]
    course_context = _read_course_context(courses_dir, topic)
    if course_context:
        parts.append("EXISTING PLATFORM COURSE EXCERPTS:\n" + course_context)
    if resources:
        resource_text = "\n\n".join(
            f"LEARNER RESOURCE ({resource.kind}): {resource.name}\n{resource.text}"
            for resource in resources
        )
        parts.append("LEARNER-PROVIDED MATERIAL:\n" + resource_text)
    else:
        parts.append(
            "LEARNER-PROVIDED MATERIAL: none; infer a beginner-friendly progression from the topic and platform sources."
        )
    return "\n\n".join(parts)[:MAX_CONTEXT_CHARS]


def parse_json_response(text: str) -> dict[str, Any]:
    match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    json_text = match.group(1) if match else text[text.find("{") : text.rfind("}") + 1]
    if not json_text or not json_text.startswith("{"):
        raise ValueError("AI response did not contain a JSON object")
    return json.loads(json_text)


def write_learning_path(path: LearningPath, courses_dir: Path, topic: str) -> str:
    slug = slugify_topic(topic)
    course_dir = courses_dir / slug
    if course_dir.exists():
        raise FileExistsError(f"A generated course already exists for {topic}")

    course_dir.mkdir(parents=True)
    (course_dir / "README.md").write_text(
        f"# {path.title}\n\n{path.description}\n\n"
        "## How to learn\n\n"
        "Work in tiny steps: predict the toy result, run the starter, inspect the output, "
        "and explain what changed before moving on.\n",
        encoding="utf-8",
    )

    chapter_dir = course_dir / "chapter1"
    chapter_dir.mkdir()
    for index, lesson in enumerate(path.lessons, start=1):
        lesson_dir = chapter_dir / f"lesson{index:02d}"
        lesson_dir.mkdir()
        source_refs = ", ".join(lesson.source_refs) or "platform sandbox"
        readme = (
            f"# Lesson {index}: {lesson.title}\n\n"
            f"## Objective\n{lesson.objective}\n\n"
            f"## Toy data\n{lesson.toy_data}\n\n"
            f"**Expected result:** {lesson.expected_result}\n\n"
            "## Micro-step\n"
            f"{lesson.micro_task}\n\n"
            "Run the starter now and inspect the output before changing anything.\n\n"
            f"**Inspect:** {lesson.inspect_prompt}\n\n"
            f"**Grounded in:** {source_refs}\n"
        )
        (lesson_dir / "README.md").write_text(readme, encoding="utf-8")
        (lesson_dir / "main.py").write_text(lesson.starter_code, encoding="utf-8")
        (lesson_dir / "test.py").write_text(lesson.test_code, encoding="utf-8")
        (lesson_dir / "solution.py").write_text(lesson.solution_code, encoding="utf-8")

    return slug


def validate_learning_path(path: LearningPath) -> None:
    """Reject malformed generated Python before it becomes a visible course."""
    for index, lesson in enumerate(path.lessons, start=1):
        if (
            not lesson.starter_code.strip()
            or not lesson.test_code.strip()
            or not lesson.solution_code.strip()
        ):
            raise ValueError(f"Lesson {index} is missing executable code")
        try:
            ast.parse(lesson.starter_code)
            ast.parse(lesson.test_code)
            ast.parse(lesson.solution_code)
        except SyntaxError as exc:
            raise ValueError(f"Lesson {index} contains invalid Python: {exc.msg}") from exc
