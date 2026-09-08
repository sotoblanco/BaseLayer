"""
Agentic Workflow for Course Generation in BaseLayer.

Orchestrates the 4 tool calls:
1. get_learning_intent
2. get_context_learning
3. get_platform_content_tools
4. curate_solveit_course

And materializes the curated course into the filesystem for immediate execution.
"""

from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from agentic_tools import (
    CuratedCourseResult,
    CuratedLessonBlueprint,
    ToolTrace,
    curate_solveit_course,
    get_context_learning,
    get_learning_intent,
    get_platform_content_tools,
)


class CourseGenerationError(RuntimeError):
    """Raised when the builder must REFUSE to publish a course.

    This happens when a course cannot be generated honestly: the LLM is
    unavailable or returns nothing usable, or the lessons would depend on
    platform-owned assets (a real template sheet, a real question image) that a
    generative builder cannot supply. Raising guarantees that no placeholder or
    topic-ignoring lesson set is ever written to disk as a real course.
    """


class AgenticWorkflowResult(BaseModel):
    """Overall outcome of the agentic course generation workflow."""

    slug: str
    title: str
    description: str
    narrative_arc: str
    lesson_count: int
    lessons: list[CuratedLessonBlueprint]
    tool_traces: list[ToolTrace] = Field(default_factory=list)
    grounded_in: list[str] = Field(default_factory=list)
    solveit_compliance: dict[str, bool] = Field(default_factory=dict)


def _extract_json_from_llm(text: str) -> dict[str, Any]:
    """Safely extracts JSON object from an LLM text output."""
    match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if match:
        json_str = match.group(1)
    else:
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1:
            json_str = text[first_brace : last_brace + 1]
        else:
            json_str = text
    return json.loads(json_str)


def _validate_code_only_lessons(lessons: list[CuratedLessonBlueprint]) -> None:
    for lesson in lessons:
        if lesson.modality != "code":
            raise CourseGenerationError(
                f"Cannot publish lesson {lesson.order} ('{lesson.title}'): "
                f"{lesson.modality} exercises need platform-owned assets that a "
                "generated course cannot supply. No course was written to disk."
            )


def _resolve_course_directory(courses_dir: Path, slug: str, overwrite: bool) -> Path:
    course_path = courses_dir / slug
    protected_courses = {"tinytorch", "data-modeling", "pytorch", "llms-from-scratch"}
    if not course_path.exists():
        course_path.mkdir(parents=True, exist_ok=True)
        return course_path

    if overwrite and slug not in protected_courses:
        import shutil

        shutil.rmtree(course_path)
    else:
        timestamp_suffix = int(time.time()) % 10000
        course_path = courses_dir / f"{slug}-{timestamp_suffix}"

    course_path.mkdir(parents=True, exist_ok=True)
    return course_path


def _write_lesson_files(lesson_dir: Path, lesson: CuratedLessonBlueprint) -> None:
    lesson_dir.mkdir(exist_ok=True)
    lesson_readme = (
        f"# Lesson {lesson.order}: {lesson.title}\n\n"
        f"## Objective\n{lesson.objective}\n\n"
        "## 1. Toy Data (Predict First)\n"
        "Before writing any code or changing formulas, examine this minimal sample:\n"
        f"```text\n{lesson.toy_data}\n```\n\n"
        f"**Expected Outcome:** `{lesson.expected_result}`\n\n"
        "## 2. Your Micro-Step (1 to 3 Lines)\n"
        f"{lesson.micro_task}\n\n"
        "## 3. Live Inspection\n"
        f"{lesson.inspect_prompt}\n\n"
        "## 4. Curiosity & Simplification\n"
        f"{lesson.curiosity_prompt}\n\n"
        "---\n"
        f"*Modality: {lesson.modality.title()} | Pedagogy: Solveit (Fast.ai / Answer.AI)*\n"
    )
    (lesson_dir / "README.md").write_text(lesson_readme, encoding="utf-8")

    metadata: dict[str, Any] = {
        "exercise_type": lesson.modality,
        "skills": list(lesson.skills),
    }

    if lesson.modality == "code":
        metadata["language"] = lesson.language
        (lesson_dir / "main.py").write_text(lesson.starter_code, encoding="utf-8")
        (lesson_dir / "test.py").write_text(lesson.test_code, encoding="utf-8")
        (lesson_dir / "solution.py").write_text(lesson.solution_code, encoding="utf-8")

    (lesson_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def _collect_course_skills(lessons: list[CuratedLessonBlueprint]) -> list[str]:
    seen: set[str] = set()
    skills: list[str] = []
    for lesson in lessons:
        for skill in lesson.skills:
            if skill and skill not in seen:
                seen.add(skill)
                skills.append(skill)
    return skills


def materialize_curated_course(
    curated: CuratedCourseResult,
    courses_dir: Path,
    overwrite: bool = True,
) -> Path:
    """Writes a curated course into the filesystem for immediate execution by BaseLayer.

    Creates:
    - courses/{slug}/README.md
    - courses/{slug}/chapter1/lesson01/
      - README.md (Solveit instructions)
      - metadata.json (exercise_type configuration)
      - main.py, test.py, solution.py (for code exercises)
    """
    _validate_code_only_lessons(curated.lessons)
    course_path = _resolve_course_directory(courses_dir, curated.slug, overwrite)

    overview_text = (
        f"# {curated.title}\n\n"
        f"{curated.description}\n\n"
        "## Narrative & Learning Arc\n"
        f"{curated.narrative_arc}\n\n"
        "## Solveit Methodology in this Course\n"
        "- **Toy Data First**: Every lesson presents a minimal 3-5 item example to predict before running.\n"
        "- **Micro-Steps**: Tasks require 1 to 3 logical lines of code. No massive boilerplate dumps.\n"
        "- **Live Inspection**: Test in the editor and verify the exact output immediately.\n"
        "- **Curiosity Loop**: Reflect and simplify before moving to the next concept.\n\n"
        "## Grounded In\n" + "\n".join(f"- {ref}" for ref in curated.grounded_in) + "\n"
    )
    (course_path / "README.md").write_text(overview_text, encoding="utf-8")

    chapter_dir = course_path / "chapter1"
    chapter_dir.mkdir(exist_ok=True)

    for lesson in curated.lessons:
        _write_lesson_files(chapter_dir / f"lesson{lesson.order:02d}", lesson)

    (course_path / "metadata.json").write_text(
        json.dumps(
            {"title": curated.title, "skills": _collect_course_skills(curated.lessons)},
            indent=2,
        ),
        encoding="utf-8",
    )

    return course_path


def _apply_lesson_override(
    blueprint: CuratedLessonBlueprint, override: dict[str, Any]
) -> CuratedLessonBlueprint:
    cur = blueprint.model_copy(deep=True)
    text_fields = (
        "title",
        "objective",
        "toy_data",
        "expected_result",
        "micro_task",
        "inspect_prompt",
        "curiosity_prompt",
    )
    for field in text_fields:
        val = override.get(field)
        if val:
            setattr(cur, field, str(val).strip() if field in ("title", "objective") else str(val))
    if override.get("order") is not None:
        cur.order = int(override["order"])
    return cur


def _find_override_blueprint(
    orig_map: dict[int, CuratedLessonBlueprint], item: dict[str, Any]
) -> CuratedLessonBlueprint | None:
    key = item.get("original_order") or item.get("order")
    if key in orig_map:
        return _apply_lesson_override(orig_map[key], item)
    return None


def _renumber_lessons(lessons: list[CuratedLessonBlueprint]) -> list[CuratedLessonBlueprint]:
    lessons.sort(key=lambda l: l.order)
    for idx, lesson in enumerate(lessons, start=1):
        lesson.order = idx
    return lessons


def _collect_overridden_lessons(
    plan_lessons: list[CuratedLessonBlueprint], overrides: list[dict[str, Any]]
) -> list[CuratedLessonBlueprint]:
    orig_map = {l.order: l for l in plan_lessons}
    result = [
        bp for item in overrides if (bp := _find_override_blueprint(orig_map, item)) is not None
    ]
    if not result:
        raise CourseGenerationError("Cannot approve a course with no valid lessons.")
    return result


def _resolve_overridden_lessons(
    plan_lessons: list[CuratedLessonBlueprint],
    overrides: list[dict[str, Any]] | None,
) -> list[CuratedLessonBlueprint]:
    if not overrides:
        return plan_lessons
    return _renumber_lessons(_collect_overridden_lessons(plan_lessons, overrides))


def materialize_planned_course(
    plan: AgenticWorkflowResult,
    courses_dir: Path,
    title_override: str | None = None,
    description_override: str | None = None,
    lessons_override: list[dict[str, Any]] | None = None,
    overwrite: bool = True,
) -> AgenticWorkflowResult:
    """Materializes a previously planned course, applying any user-approved edits."""
    title = (title_override or "").strip() or plan.title
    description = (
        plan.description if description_override is None else description_override.strip()
    )
    final_lessons = _resolve_overridden_lessons(plan.lessons, lessons_override)

    curated = CuratedCourseResult(
        slug=plan.slug,
        title=title,
        description=description,
        narrative_arc=plan.narrative_arc,
        lesson_count=len(final_lessons),
        lessons=final_lessons,
        solveit_compliance=plan.solveit_compliance,
        grounded_in=plan.grounded_in,
    )

    written_path = materialize_curated_course(curated, courses_dir, overwrite=overwrite)
    traces = list(plan.tool_traces)
    traces.append(
        ToolTrace(
            tool_name="materialize_course",
            status="completed",
            input_summary=f"Destination: {written_path.name}",
            output_summary=f"Successfully materialized {len(final_lessons)} lesson files under courses/{written_path.name}",
            details={"course_slug": written_path.name},
        )
    )

    return AgenticWorkflowResult(
        slug=written_path.name,
        title=title,
        description=description,
        narrative_arc=plan.narrative_arc,
        lesson_count=len(final_lessons),
        lessons=final_lessons,
        tool_traces=traces,
        grounded_in=plan.grounded_in,
        solveit_compliance=plan.solveit_compliance,
    )


class AgenticCourseWorkflow:
    """Agentic orchestrator executing the 4 tool calls to generate Solveit courses."""

    def __init__(
        self,
        ai_client: Any = None,
        courses_dir: Path | None = None,
        data_dir: Path | None = None,
        generate_text: Any = None,
    ):
        self.client = ai_client
        self.generate_text = generate_text
        self.courses_dir = courses_dir or Path(__file__).parent.parent / "courses"
        self.data_dir = data_dir or Path(__file__).parent.parent / "data"

    def plan(
        self,
        topic: str,
        materials: str = "",
        username: str = "",
        course_preferences: dict[str, Any] | None = None,
    ) -> AgenticWorkflowResult:
        """Executes the 4 planning tool calls without writing anything to disk:

        1. Tool 1: get_learning_intent
        2. Tool 2: get_context_learning
        3. Tool 3: get_platform_content_tools
        4. Tool 4: curate_solveit_course
        """
        traces: list[ToolTrace] = []

        # -------------------------------------------------------------------
        # Step 1: Tool 1 - get_learning_intent
        # -------------------------------------------------------------------
        t1_start = time.time()
        intent = get_learning_intent(
            topic=topic,
            materials=materials,
            courses_dir=self.courses_dir,
        )
        t1_duration = round((time.time() - t1_start) * 1000, 1)
        traces.append(
            ToolTrace(
                tool_name="get_learning_intent",
                status="completed",
                input_summary=f"Topic: '{topic}', Materials: {len(materials)} chars",
                output_summary=f"Extracted {len(intent.target_concepts)} core concepts ({', '.join(intent.target_concepts[:3])}) and {len(intent.related_platform_courses)} related platform courses.",
                details={
                    "target_concepts": intent.target_concepts,
                    "learning_goals": intent.learning_goals,
                    "related_courses": intent.related_platform_courses,
                    "duration_ms": t1_duration,
                },
            )
        )

        # -------------------------------------------------------------------
        # Step 2: Tool 2 - get_context_learning
        # -------------------------------------------------------------------
        t2_start = time.time()
        learner_ctx = get_context_learning(
            username=username,
            data_dir=self.data_dir,
        )
        if course_preferences:
            if course_preferences.get("preferred_modalities"):
                learner_ctx.preferred_modalities = course_preferences["preferred_modalities"]
            if course_preferences.get("exercise_format"):
                learner_ctx.exercise_format = course_preferences["exercise_format"]
            if course_preferences.get("tutor_style"):
                learner_ctx.tutor_style = course_preferences["tutor_style"]
            if course_preferences.get("understanding_level"):
                lvl = str(course_preferences["understanding_level"]).capitalize()
                if lvl in ("Beginner", "Intermediate", "Advanced"):
                    learner_ctx.understanding_level = lvl  # type: ignore[assignment]
        t2_duration = round((time.time() - t2_start) * 1000, 1)
        traces.append(
            ToolTrace(
                tool_name="get_context_learning",
                status="completed",
                input_summary=f"Username: '{learner_ctx.username}'",
                output_summary=f"Profile active: {learner_ctx.has_stored_profile} (Level: {learner_ctx.understanding_level}, Preferred: {', '.join(learner_ctx.preferred_modalities)}).",
                details={
                    "understanding_level": learner_ctx.understanding_level,
                    "preferred_modalities": learner_ctx.preferred_modalities,
                    "pace": learner_ctx.pace,
                    "tutor_style": learner_ctx.tutor_style,
                    "guidance": learner_ctx.personalization_guidance,
                    "duration_ms": t2_duration,
                },
            )
        )

        # -------------------------------------------------------------------
        # Step 3: Tool 3 - get_platform_content_tools
        # -------------------------------------------------------------------
        t3_start = time.time()
        platform_tools = get_platform_content_tools()
        t3_duration = round((time.time() - t3_start) * 1000, 1)
        traces.append(
            ToolTrace(
                tool_name="get_platform_content_tools",
                status="completed",
                input_summary="Query platform modalities and execution environment",
                output_summary=f"Discovered {len(platform_tools.modalities)} modalities ({', '.join(platform_tools.modalities.keys())}) and {len(platform_tools.installed_sandbox_libraries)} sandbox libraries.",
                details={
                    "modalities": list(platform_tools.modalities.keys()),
                    "sandbox_libraries": platform_tools.installed_sandbox_libraries,
                    "duration_ms": t3_duration,
                },
            )
        )

        # -------------------------------------------------------------------
        # Step 4: Tool 4 - curate_solveit_course (via LLM)
        # -------------------------------------------------------------------
        t4_start = time.time()
        course_title = f"{intent.topic.title()} with Solveit"
        course_desc = (
            f"An exploratory, micro-step course designed for {learner_ctx.username}. "
            f"Master {intent.topic} through sensory feedback, toy data, and live inspection."
        )
        narrative_arc = (
            f"From initial mental model to working implementation: "
            f"explore {', '.join(intent.target_concepts[:3])} step-by-step."
        )

        raw_lessons: list[dict[str, Any]] = []

        # Consult the LLM with the outputs of Tools 1, 2, and 3. If no model is
        # configured or the model call fails / returns nothing, we REFUSE to
        # publish rather than shipping generic, topic-ignoring placeholder
        # lessons. Nothing is written to disk in those cases.
        llm_available = self.generate_text is not None or self.client is not None
        if llm_available:
            try:
                guided_directive = ""
                if getattr(learner_ctx, "exercise_format", "") == "guided_completion":
                    guided_directive = (
                        "\n7. GUIDED CODE COMPLETION DIRECTIVE:\n"
                        "The learner has selected Guided Code Completion (scaffolded fill-in-the-blanks).\n"
                        "starter_code must be a pre-structured code skeleton containing `____` placeholders to fill in.\n"
                        "micro_task should clearly instruct the learner what values/keywords should replace each `____` blank.\n"
                    )

                system_solveit_prompt = f"""
You are an expert Solveit Curriculum Designer (Fast.ai / Answer.AI principles).
You have already received the results of the 3 context-gathering tools:

TOOL 1 (INTENT):
Topic: {intent.topic}
Target Concepts: {intent.target_concepts}
Materials Excerpt: {intent.extracted_snippets}

TOOL 2 (LEARNER CONTEXT):
User: {learner_ctx.username}
Level: {learner_ctx.understanding_level}
Preferred Modalities: {learner_ctx.preferred_modalities}
Guidance: {learner_ctx.personalization_guidance}

TOOL 3 (PLATFORM TOOLS):
Target Modality: code (all published lessons must be runnable Python code)
Installed Python Sandbox Packages: {platform_tools.installed_sandbox_libraries}

YOUR TASK:
Plan 3 to 5 micro-step lessons applying the Solveit methodology:
1. Concrete sample data (3-5 rows/items, expected output stated before running)
2. Micro-step (1-3 logical lines only)
3. Live inspection prompt
4. Curiosity reflection prompt
5. Every lesson's "modality" MUST be "code" (do not use "spreadsheet" or "drawing"). Python code lessons must import only {platform_tools.installed_sandbox_libraries}
6. test_code must import from main (e.g. from main import ...) and assert results.{guided_directive}
7. WRITING STYLE & TONE DIRECTIVES (STRICT ANTI-AI CONSTRAINTS):
   Tone: {learner_ctx.tone.upper()}
   - If PRAGMATIC: Understated, dry developer realism about software gotchas, bugs, and computer literalism. No forced comedy or puns.
   - If DIRECT: Technical manual style — neutral, factual, and concise.
   - If CONCISE: Minimal text — jump straight to code examples and runnable tasks with zero preamble.
   - BAN LLM CLICHÉS:
     * NEVER use "It is not X, but Y" or "This isn't about X, it's about Y" contrast framing.
     * NEVER use rhetorical questions ("Why do we need this?", "What happens next?").
     * NEVER use academic filler transitions ("Remember,", "Crucially,", "At its core,", "In essence,").
     * NEVER use cheerleading, exclamation-mark hype, or corporate enthusiasm.
     * State concrete behaviors directly: what the input is, what breaks, and the exact code line to handle it.

Return a JSON object with this exact shape:
{{
  "title": "{course_title}",
  "description": "{course_desc}",
  "narrative_arc": "{narrative_arc}",
  "lessons": [
    {{
      "title": "Lesson title",
      "modality": "code",
      "objective": "Atomic objective",
      "toy_data": "sample = ...",
      "expected_result": "expected value",
      "micro_task": "Write 1-3 lines to ...",
      "inspect_prompt": "What does output show?",
      "curiosity_prompt": "Can we simplify this?",
      "starter_code": "def func():\\n    pass\\n",
      "test_code": "from main import func\\nassert func() == expected\\n",
      "solution_code": "def func():\\n    return expected\\n"
    }}
  ]
}}
"""
                llm_text = None
                if self.generate_text is not None:
                    llm_text = self.generate_text(system_solveit_prompt)
                elif self.client is not None and hasattr(self.client, "chat"):
                    default_m = (
                        "gemini-3.5-flash-lite"
                        if os.environ.get("LLM_PROVIDER") == "gemini"
                        else "gpt-5.6-luna"
                    )
                    completion = self.client.chat.completions.create(
                        model=os.environ.get("LLM_MODEL") or default_m,
                        messages=[{"role": "user", "content": system_solveit_prompt}],
                    )
                    llm_text = (completion.choices[0].message.content or "").strip()

                if llm_text:
                    parsed_plan = _extract_json_from_llm(llm_text)
                    course_title = parsed_plan.get("title", course_title)
                    course_desc = parsed_plan.get("description", course_desc)
                    narrative_arc = parsed_plan.get("narrative_arc", narrative_arc)
                    raw_lessons = parsed_plan.get("lessons", [])
            except Exception as exc:
                raise CourseGenerationError(
                    "We couldn't build this course: the AI model call failed "
                    f"({exc}). No course was published. Check your AI provider "
                    "status and try again."
                ) from exc

        if not raw_lessons:
            if not llm_available:
                raise CourseGenerationError(
                    f"No AI model is configured, so we can't build a real course for "
                    f"'{intent.topic}'. We refuse to publish placeholder lessons that "
                    "ignore your topic. Nothing was written to disk. Configure an AI "
                    "provider (Settings → AI Features) and try again."
                )
            raise CourseGenerationError(
                f"The AI model returned no usable lessons for '{intent.topic}'. We "
                "refuse to publish placeholder content. Nothing was written to disk — "
                "please try again."
            )

        # Normalize modalities: models often output "python", "Python", or "Code"
        # for runnable code lessons. Accept those as "code".
        for lesson in raw_lessons:
            mod = str(lesson.get("modality") or "code").lower().strip()
            if mod in ("code", "python", "py"):
                lesson["modality"] = "code"
            elif (lesson.get("starter_code") or lesson.get("test_code")) and mod not in (
                "spreadsheet",
                "drawing",
            ):
                lesson["modality"] = "code"

        # A generated course may only publish code lessons: spreadsheet and drawing
        # lessons need platform-owned assets (a real template sheet id, a real
        # question image) that a text model cannot supply. Reject them instead of
        # writing courses that depend on unowned or blank assets.
        non_code = [
            lesson.get("title") or f"lesson {idx}"
            for idx, lesson in enumerate(raw_lessons, start=1)
            if lesson.get("modality") != "code"
        ]
        if non_code:
            raise CourseGenerationError(
                "The AI model proposed lessons that need assets it cannot supply "
                f"(e.g. '{non_code[0]}'). Generated courses only publish runnable "
                "code lessons. Nothing was written to disk — please try again."
            )

        curated = curate_solveit_course(
            course_title=course_title,
            course_description=course_desc,
            narrative_arc=narrative_arc,
            lessons=raw_lessons,
            learner_context=learner_ctx,
            platform_tools=platform_tools,
        )

        t4_duration = round((time.time() - t4_start) * 1000, 1)
        traces.append(
            ToolTrace(
                tool_name="curate_solveit_course",
                status="completed",
                input_summary=f"Synthesize {len(raw_lessons)} lessons under Solveit directives",
                output_summary=f"Curated {curated.lesson_count} micro-step lessons. Solveit compliance validated across all directives.",
                details={
                    "title": curated.title,
                    "lesson_count": curated.lesson_count,
                    "solveit_compliance": curated.solveit_compliance,
                    "duration_ms": t4_duration,
                },
            )
        )

        return AgenticWorkflowResult(
            slug=curated.slug,
            title=curated.title,
            description=curated.description,
            narrative_arc=curated.narrative_arc,
            lesson_count=curated.lesson_count,
            lessons=curated.lessons,
            tool_traces=traces,
            grounded_in=curated.grounded_in,
            solveit_compliance=curated.solveit_compliance,
        )

    def execute(
        self,
        topic: str,
        materials: str = "",
        username: str = "",
        course_preferences: dict[str, Any] | None = None,
        overwrite: bool = True,
    ) -> AgenticWorkflowResult:
        """Executes the complete workflow: plans the course and materializes it to disk."""
        planned = self.plan(
            topic=topic,
            materials=materials,
            username=username,
            course_preferences=course_preferences,
        )
        return materialize_planned_course(
            plan=planned,
            courses_dir=self.courses_dir,
            overwrite=overwrite,
        )
