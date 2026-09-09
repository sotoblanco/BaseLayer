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
    normalize_sheet_cells,
    normalize_source_refs,
    normalize_success_cells,
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
    suggested_lesson_count: int = 0
    course_depth: str = "auto"


def _resolve_course_depth(course_preferences: dict[str, Any] | None) -> tuple[str, str]:
    """Map the learner's depth choice to an LLM lesson-count directive.

    Returns (depth_name, count_directive). Auto lets the model pick 3-8 from
    topic complexity; short/standard/deep pin explicit ranges.
    """
    depth = str((course_preferences or {}).get("course_depth", "auto") or "auto").lower()
    if depth not in ("auto", "short", "standard", "deep"):
        depth = "auto"
    directives = {
        "auto": "Choose 3 to 8 lessons based on topic complexity (narrow topic: fewer; broad topic: more). Report why you chose that count.",
        "short": "Plan exactly 3 to 4 lessons (quick exploratory pass).",
        "standard": "Plan exactly 5 to 6 lessons (balanced coverage).",
        "deep": "Plan exactly 7 to 8 lessons (thorough deep-dive).",
    }
    return depth, directives[depth]


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


def _validate_publishable_lessons(lessons: list[CuratedLessonBlueprint]) -> None:
    """Refuse lessons that cannot run without assets a generator cannot supply.

    Code lessons run in the sandbox. Spreadsheet lessons carry an inline
    ``sheet.cells`` template (provisioned per learner), so no template sheet id
    is needed. Drawing lessons fall back to a blank chalkboard canvas, so no
    question image is needed. Only structurally incomplete lessons are refused.
    """
    for lesson in lessons:
        if lesson.modality == "code":
            if not (lesson.starter_code and lesson.test_code and lesson.solution_code):
                raise CourseGenerationError(
                    f"Cannot publish lesson {lesson.order} ('{lesson.title}'): "
                    "code lessons need starter, test, and solution code. "
                    "No course was written to disk."
                )
        elif lesson.modality == "spreadsheet":
            if not lesson.sheet_cells or not lesson.success_cells:
                raise CourseGenerationError(
                    f"Cannot publish lesson {lesson.order} ('{lesson.title}'): "
                    "spreadsheet lessons need inline sheet_cells and success_cells. "
                    "No course was written to disk."
                )
        elif lesson.modality == "drawing":
            if not lesson.drawing_prompt:
                raise CourseGenerationError(
                    f"Cannot publish lesson {lesson.order} ('{lesson.title}'): "
                    "drawing lessons need a drawing_prompt for the canvas. "
                    "No course was written to disk."
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


def _format_source_list(source_refs: list[str]) -> str:
    """Render cited sources for a lesson README."""
    refs = [ref.strip() for ref in source_refs if ref and str(ref).strip()]
    if not refs:
        return "_No external citations for this step._"
    return "\n".join(f"- {ref}" for ref in refs)


def _write_lesson_files(lesson_dir: Path, lesson: CuratedLessonBlueprint) -> None:
    lesson_dir.mkdir(exist_ok=True)
    explanation_block = (
        f"## Explanation\n{lesson.explanation}\n\n" if lesson.explanation.strip() else ""
    )
    if lesson.modality == "spreadsheet":
        example_block = (
            "## Example (Predict First)\n"
            "Open your provisioned sheet copy and find these starter cells:\n"
            f"```text\n{lesson.toy_data}\n```\n\n"
            f"**Expected Outcome:** `{lesson.expected_result}`\n\n"
        )
        assignment_block = f"## Assignment (Formulas, Not Code)\n{lesson.micro_task}\n\n"
    elif lesson.modality == "drawing":
        example_block = (
            "## Example (Look First)\n"
            f"```text\n{lesson.toy_data}\n```\n\n"
            f"**Expected Outcome:** `{lesson.expected_result}`\n\n"
        )
        assignment_block = (
            "## Assignment (Sketch on the Canvas)\n"
            f"{lesson.drawing_prompt or lesson.micro_task}\n\n"
        )
    else:
        example_block = (
            "## Example (Predict First)\n"
            "Before writing any code, examine this minimal sample:\n"
            f"```text\n{lesson.toy_data}\n```\n\n"
            f"**Expected Outcome:** `{lesson.expected_result}`\n\n"
        )
        assignment_block = f"## Assignment (1 to 3 Lines)\n{lesson.micro_task}\n\n"
    lesson_readme = (
        f"# Topic: {lesson.title}\n\n"
        f"## Objective\n{lesson.objective}\n\n"
        f"{explanation_block}"
        f"{example_block}"
        f"{assignment_block}"
        "## 3. Live Inspection\n"
        f"{lesson.inspect_prompt}\n\n"
        "## 4. Curiosity & Simplification\n"
        f"{lesson.curiosity_prompt}\n\n"
        "## Sources\n"
        f"{_format_source_list(lesson.source_refs)}\n\n"
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
    elif lesson.modality == "spreadsheet":
        metadata["sheet"] = {"cells": dict(lesson.sheet_cells)}
        metadata["success_cells"] = list(lesson.success_cells)
    elif lesson.modality == "drawing":
        metadata["drawing"] = {"prompt_text": lesson.drawing_prompt or lesson.micro_task}

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
      - README.md (concept, example, task, sources)
      - metadata.json (exercise_type configuration)
      - main.py, test.py, solution.py (for code exercises)
    """
    _validate_publishable_lessons(curated.lessons)
    course_path = _resolve_course_directory(courses_dir, curated.slug, overwrite)

    overview_text = (
        f"# {curated.title}\n\n"
        f"{curated.description}\n\n"
        "## Narrative & Learning Arc\n"
        f"{curated.narrative_arc}\n\n"
        "## Solveit Methodology in this Course\n"
        "- **Sample Data First**: Every lesson presents a minimal 3-5 item example to predict before running.\n"
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
        "explanation",
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
    modality = override.get("modality")
    if isinstance(modality, str) and modality.lower().strip() in ("code", "spreadsheet", "drawing"):
        cur.modality = modality.lower().strip()  # type: ignore[assignment]
    if override.get("sheet_cells") is not None:
        parsed_cells = normalize_sheet_cells(override.get("sheet_cells"))
        if parsed_cells:
            cur.sheet_cells = parsed_cells
    if override.get("success_cells") is not None:
        parsed_targets = normalize_success_cells(override.get("success_cells"))
        if parsed_targets:
            cur.success_cells = parsed_targets
    if override.get("drawing_prompt") is not None:
        cur.drawing_prompt = str(override.get("drawing_prompt") or "")
    if override.get("source_refs") is not None:
        parsed_refs = normalize_source_refs(override.get("source_refs"))
        if parsed_refs:
            cur.source_refs = parsed_refs
    return cur


def _find_override_blueprint(
    orig_map: dict[int, CuratedLessonBlueprint], item: dict[str, Any]
) -> CuratedLessonBlueprint | None:
    key = item.get("original_order") or item.get("order")
    if key in orig_map:
        return _apply_lesson_override(orig_map[key], item)
    return None


def _renumber_lessons(lessons: list[CuratedLessonBlueprint]) -> list[CuratedLessonBlueprint]:
    lessons.sort(key=lambda lesson_bp: lesson_bp.order)
    for idx, lesson in enumerate(lessons, start=1):
        lesson.order = idx
    return lessons


def _collect_overridden_lessons(
    plan_lessons: list[CuratedLessonBlueprint], overrides: list[dict[str, Any]]
) -> list[CuratedLessonBlueprint]:
    orig_map = {lesson_bp.order: lesson_bp for lesson_bp in plan_lessons}
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
    description = plan.description if description_override is None else description_override.strip()
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
        suggested_lesson_count=plan.suggested_lesson_count or len(final_lessons),
        course_depth=plan.course_depth,
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
        outline: str = "",
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
        depth_name, count_directive = _resolve_course_depth(course_preferences)
        clean_outline = (outline or "").strip()[:2000]
        outline_block = (
            f"\nLEARNER-DEFINED OUTLINE (must-cover points, in order when possible):\n{clean_outline}\n"
            if clean_outline
            else "\nLEARNER-DEFINED OUTLINE: none — infer the best progression for the topic.\n"
        )
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
        requested = [str(m).lower() for m in (learner_ctx.preferred_modalities or [])]
        allowed_modalities = [m for m in requested if m in ("code", "spreadsheet", "drawing")]
        if not allowed_modalities:
            allowed_modalities = ["code", "spreadsheet", "drawing"]
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
                    "allowed_modalities": allowed_modalities,
                    "duration_ms": t3_duration,
                },
            )
        )

        # -------------------------------------------------------------------
        # Step 4: Tool 4 - curate_solveit_course (via LLM)
        # -------------------------------------------------------------------
        t4_start = time.time()
        course_title = intent.topic.title()
        course_desc = (
            f"An exploratory, micro-step course designed for {learner_ctx.username}. "
            f"Master {intent.topic} through concrete sample data, sensory feedback, and live inspection."
        )
        narrative_arc = (
            f"From initial mental model to working implementation: "
            f"explore {intent.topic} step-by-step."
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
                        "\n9. GUIDED CODE COMPLETION DIRECTIVE:\n"
                        "The learner has selected Guided Code Completion (scaffolded fill-in-the-blanks).\n"
                        "For CODE lessons, starter_code must be a pre-structured code skeleton containing `____` placeholders to fill in.\n"
                        "micro_task should clearly instruct the learner what values/keywords should replace each `____` blank.\n"
                    )

                modality_directive = (
                    "Use ONLY these modalities across the course: "
                    f"{', '.join(allowed_modalities)}. Assign each lesson the modality that fits best:\n"
                    "- 'drawing' when the learner needs architecture or data-flow intuition before formulas/code (e.g. first contact with a pipeline, token routing, layer connections). Drawing lessons need 'drawing_prompt' (the canvas task); no image file is required.\n"
                    "- 'spreadsheet' when the concept is matrix shapes, broadcasting, or stepwise numeric intuition (MMULT, ARRAYFORMULA, cell math). Spreadsheet lessons need 'sheet_cells' (inline {A1: value-or-formula} starter template) and 'success_cells' ([{cell, expected}] graded targets); no Google Sheet id is required — a copy is provisioned per learner.\n"
                    "- 'code' for implementing concrete functions and algorithmic logic (starter_code with # TODO that FAILS test_code; solution_code that PASSES in 1-3 lines; test_code imports from main).\n"
                    "Blend modalities across the course so intuition (drawing/spreadsheet) precedes implementation (code) where it helps."
                    if len(allowed_modalities) > 1
                    else f"Every lesson's modality MUST be '{allowed_modalities[0]}'."
                )

                system_solveit_prompt = f"""
You are an expert curriculum designer for BaseLayer, an interactive coding studio.
You have already received the results of the 3 context-gathering tools:

TOOL 1 (INTENT):
Topic: {intent.topic}
Target Concepts: {intent.target_concepts}
Clarification / reference notes (CONTEXT ONLY — never copy verbatim into lessons): {intent.extracted_snippets or "none — invent fresh domain sample data"}
Full learning goals: {intent.learning_goals}

TOOL 2 (LEARNER CONTEXT):
User: {learner_ctx.username}
Level: {learner_ctx.understanding_level}
Preferred Modalities: {learner_ctx.preferred_modalities}
Guidance: {learner_ctx.personalization_guidance}

TOOL 3 (PLATFORM TOOLS):
Allowed modalities for THIS course: {allowed_modalities}
Modality capabilities:
- code: Monaco editor + sandbox (Python). Imports limited to {platform_tools.installed_sandbox_libraries}.
- spreadsheet: embedded Google Sheets copy provisioned from your inline sheet_cells; graded via success_cells.
- drawing: hand-drawing canvas (blank chalkboard when no image); graded against drawing_prompt rubric.

YOUR TASK:
Course size (learner chose "{depth_name}"): {count_directive}
{outline_block}
Plan micro-step lessons applying the Solveit methodology. Every lesson follows Topic → Explanation → Example → Assignment:
1. "explanation": concept explainer BEFORE the exercise. Lesson 1 is always a foundations explainer (what the concept is, why it matters, one mental model) — never jump straight into code for beginners. Beginners get 3-4 sentences; others 1-2 sentences. NEVER show the word "toy" to the learner in titles, objectives, explanations, or descriptions ("toy_data" is only the internal JSON field name).
2. "toy_data" + "expected_result": concrete sample data (3-5 rows/items, expected output stated before running).
3. "micro_task": assignment in 1-3 logical lines only (code: lines of code; spreadsheet: cell formulas to enter; drawing: what to sketch), plus "inspect_prompt" (live inspection) and "curiosity_prompt" (reflection).
4. {modality_directive}
5. Code lessons: Python must import only {platform_tools.installed_sandbox_libraries}; test_code must import from main (e.g. from main import ...) and assert results. Spreadsheet lessons: "sheet_cells" is a small {{A1: value-or-"=FORMULA"}} starter map (<=15 cells), "success_cells" lists 1-4 graded {{cell, expected}} targets that your formulas must satisfy. Drawing lessons: "drawing_prompt" states exactly what to draw and how success is judged.
6. ANTI-ECHO RULE (STRICT): clarification notes describe intent — they are NOT example data. NEVER copy the topic words or clarification sentences verbatim into "toy_data"/"expected_result" (e.g. if the learner wrote "learning vector search", do NOT emit docs = ['learning vector search', ...]). Always invent fresh, domain-realistic sample data for the topic (for BM25: real term lists, doc collections, scores — not the learner's own sentence).
7. SOURCES: every lesson MUST carry "source_refs" with 1-3 named citations (RFCs, vendor docs, textbooks, papers) the learner can look up. Prefer sources from the learner materials when provided.{guided_directive}
8. WRITING STYLE & TONE DIRECTIVES (STRICT ANTI-AI CONSTRAINTS):
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
      "modality": "code | spreadsheet | drawing (only from the allowed list)",
      "objective": "Atomic objective",
      "explanation": "Concept explainer: what this is and why it matters (lesson 1 = foundations, never code-only).",
      "source_refs": ["Named citation the learner can look up"],
      "toy_data": "sample = ...",
      "expected_result": "expected value",
      "micro_task": "Write 1-3 lines to ... (code) / formulas to enter (spreadsheet) / what to sketch (drawing)",
      "inspect_prompt": "What does output show?",
      "curiosity_prompt": "Can we simplify this?",
      "starter_code": "def func():\\n    pass\\n (code lessons only)",
      "test_code": "from main import func\\nassert func() == expected\\n (code lessons only)",
      "solution_code": "def func():\\n    return expected\\n (code lessons only)",
      "sheet_cells": {{"A1": "label", "B2": 3, "G2": "=ROWS(B2:D4)"}} (spreadsheet lessons only)",
      "success_cells": [{{"cell": "G2", "expected": "3x3"}}] (spreadsheet lessons only)",
      "drawing_prompt": "Circle the cell holding 50; one clean loop, no stray marks (drawing lessons only)"
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
        # for runnable code lessons. Accept those as "code". Unknown labels fall
        # back to the learner's first allowed modality in curate_solveit_course.
        for lesson in raw_lessons:
            mod = str(lesson.get("modality") or "code").lower().strip()
            if mod in ("code", "python", "py"):
                lesson["modality"] = "code"
            elif mod in ("spreadsheet", "sheets", "sheet"):
                lesson["modality"] = "spreadsheet"
            elif mod in ("drawing", "draw", "sketch", "hand_drawn", "hand-drawn", "chalkboard"):
                lesson["modality"] = "drawing"
            elif (lesson.get("starter_code") or lesson.get("test_code")) and mod not in (
                "spreadsheet",
                "drawing",
            ):
                lesson["modality"] = "code"

        try:
            curated = curate_solveit_course(
                course_title=course_title,
                course_description=course_desc,
                narrative_arc=narrative_arc,
                lessons=raw_lessons,
                learner_context=learner_ctx,
                platform_tools=platform_tools,
                allowed_modalities=allowed_modalities,
            )
        except ValueError as exc:
            raise CourseGenerationError(
                f"The AI model returned lessons that cannot run as-is ({exc}). "
                "Nothing was written to disk — please try again."
            ) from exc

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
                    "modalities": [lesson.modality for lesson in curated.lessons],
                    "allowed_modalities": allowed_modalities,
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
            suggested_lesson_count=curated.lesson_count,
            course_depth=depth_name,
        )

    def execute(
        self,
        topic: str,
        materials: str = "",
        username: str = "",
        course_preferences: dict[str, Any] | None = None,
        outline: str = "",
        overwrite: bool = True,
    ) -> AgenticWorkflowResult:
        """Executes the complete workflow: plans the course and materializes it to disk."""
        planned = self.plan(
            topic=topic,
            materials=materials,
            username=username,
            course_preferences=course_preferences,
            outline=outline,
        )
        return materialize_planned_course(
            plan=planned,
            courses_dir=self.courses_dir,
            overwrite=overwrite,
        )
