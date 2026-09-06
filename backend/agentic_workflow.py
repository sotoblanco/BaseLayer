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
    TRANSPARENT_PNG_BYTES,
    CuratedCourseResult,
    CuratedLessonBlueprint,
    LearnerContextResult,
    LearningIntentResult,
    PlatformToolsResult,
    ToolTrace,
    curate_solveit_course,
    get_context_learning,
    get_learning_intent,
    get_platform_content_tools,
)


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


def build_fallback_solveit_lessons(
    intent: LearningIntentResult,
    learner_ctx: LearnerContextResult,
    platform_tools: PlatformToolsResult,
) -> list[dict[str, Any]]:
    """Synthesizes high-quality Solveit micro-lessons deterministically.

    Used when LLM is offline, unconfigured, or rate-limited.
    Guarantees that every lesson has concrete toy data, micro-tasks (1-3 lines),
    and verified Python syntax.
    """
    topic_clean = intent.topic
    primary_concepts = intent.target_concepts[:4] or ["core", "primitives", "chaining"]

    # Incorporate learner preferred modalities if available
    preferred = learner_ctx.preferred_modalities

    lessons: list[dict[str, Any]] = []

    # Lesson 1: Toy Data & Foundation
    c1 = primary_concepts[0] if len(primary_concepts) > 0 else "data"
    lessons.append(
        {
            "title": f"Foundation: Minimal {c1.title()}",
            "modality": "code",
            "language": "python",
            "objective": f"Initialize and inspect a minimal 3-element {c1} structure.",
            "toy_data": "sample = [10, 20, 30] -> len is 3",
            "expected_result": "3",
            "micro_task": f"Define `create_{c1}()` returning the 3-element list or vector.",
            "inspect_prompt": f"Run the code. Does `create_{c1}()` have length 3?",
            "curiosity_prompt": "Can we define this using a list comprehension or generator?",
            "starter_code": f"def create_{c1}():\n    # Write 1-2 lines to return [10, 20, 30]\n    pass\n",
            "test_code": f"from main import create_{c1}\n\nres = create_{c1}()\nassert len(res) == 3\nassert res[0] == 10\n",
            "solution_code": f"def create_{c1}():\n    return [10, 20, 30]\n",
            "source_refs": ["Platform Sandbox", intent.topic],
        }
    )

    # Lesson 2: Transformation / Operation
    c2 = primary_concepts[1] if len(primary_concepts) > 1 else "transform"
    lessons.append(
        {
            "title": f"Micro-Step: {c2.title()} Transformation",
            "modality": "code",
            "language": "python",
            "objective": "Apply a 1-line transformation to double each element.",
            "toy_data": "items = [1, 2, 3] -> doubled = [2, 4, 6]",
            "expected_result": "[2, 4, 6]",
            "micro_task": "Implement `scale_by_two(items)` in 1-2 lines.",
            "inspect_prompt": "Print the scaled output. Did [1, 2, 3] become [2, 4, 6]?",
            "curiosity_prompt": "How does this compare to element-wise operations in NumPy or PyTorch?",
            "starter_code": "def scale_by_two(items):\n    # 1-2 lines: return doubled elements\n    pass\n",
            "test_code": "from main import scale_by_two\n\nassert scale_by_two([1, 2, 3]) == [2, 4, 6]\nassert scale_by_two([]) == []\n",
            "solution_code": "def scale_by_two(items):\n    return [x * 2 for x in items]\n",
            "source_refs": ["Solveit JRY-before-DRY", "Platform Python Sandbox"],
        }
    )

    # Lesson 3: Optional Spreadsheet or Drawing if learner prefers multi-modal
    if "drawing" in preferred:
        lessons.append(
            {
                "title": f"Visual Architecture: {topic_clean} Dataflow",
                "modality": "drawing",
                "language": "python",
                "objective": "Map the flow of data from input to output.",
                "toy_data": "Input -> Processing Step -> Output",
                "expected_result": "Direct arrow connecting input node to output node.",
                "micro_task": "Draw arrows connecting the input container to the output evaluation block.",
                "inspect_prompt": "Check that each node has an incoming and outgoing pathway.",
                "curiosity_prompt": "What edge-case could cause this pathway to block or bottleneck?",
                "question_image_desc": "Architectural diagram of dataflow pipeline",
                "source_refs": ["BaseLayer Drawing Modality"],
            }
        )
    elif "spreadsheet" in preferred:
        lessons.append(
            {
                "title": f"Matrix Intuition: {topic_clean} in Sheets",
                "modality": "spreadsheet",
                "language": "python",
                "objective": "Experiment with matrix broadcasting and array formulas.",
                "toy_data": "Range A1:B2 = [[1, 2], [3, 4]]",
                "expected_result": "Doubled matrix values",
                "micro_task": "Use =ARRAYFORMULA(A1:B2 * 2) in the spreadsheet pane.",
                "inspect_prompt": "Check cell C1: does it show 2, and D2 show 8?",
                "curiosity_prompt": "How does Google Sheets ARRAYFORMULA map to NumPy vectorization?",
                "google_sheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                "copy_on_open": True,
                "source_refs": ["BaseLayer Spreadsheet Modality"],
            }
        )

    # Lesson 4: Composition into working primitive
    c3 = primary_concepts[2] if len(primary_concepts) > 2 else "pipeline"
    lessons.append(
        {
            "title": f"Composition: Clean {c3.title()} Primitive",
            "modality": "code",
            "language": "python",
            "objective": "Compose the steps into a clean, minimal class (<25 lines).",
            "toy_data": "data = [5, 10] -> processed = 30",
            "expected_result": "30",
            "micro_task": f"Build `class {c3.title()}Runner` with a `compute(data)` method.",
            "inspect_prompt": "Instantiate the class and check the return value of compute([5, 10]).",
            "curiosity_prompt": "Can we replace any remaining boilerplate with dynamic dispatch or properties?",
            "starter_code": f"class {c3.title()}Runner:\n    def compute(self, data):\n        # 1-3 lines: sum the doubled elements of data\n        pass\n",
            "test_code": f"from main import {c3.title()}Runner\n\nrunner = {c3.title()}Runner()\nassert runner.compute([5, 10]) == 30\n",
            "solution_code": f"class {c3.title()}Runner:\n    def compute(self, data):\n        return sum(x * 2 for x in data)\n",
            "source_refs": ["Solveit Directive 3: Ruthless Boilerplate Elimination"],
        }
    )

    return lessons


def materialize_curated_course(
    curated: CuratedCourseResult,
    courses_dir: Path,
) -> Path:
    """Writes a curated course into the filesystem for immediate execution by BaseLayer.

    Creates:
    - courses/{slug}/README.md
    - courses/{slug}/chapter1/lesson01/
      - README.md (Solveit instructions)
      - metadata.json (exercise_type configuration)
      - main.py, test.py, solution.py (for code exercises)
      - question.png (for drawing exercises)
    """
    course_path = courses_dir / curated.slug
    if course_path.exists():
        # Add timestamp suffix if collision occurs
        timestamp_suffix = int(time.time()) % 10000
        course_path = courses_dir / f"{curated.slug}-{timestamp_suffix}"

    course_path.mkdir(parents=True, exist_ok=True)

    # Write Course Overview README
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
        lesson_dir = chapter_dir / f"lesson{lesson.order:02d}"
        lesson_dir.mkdir(exist_ok=True)

        # Build Solveit README
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

        # Metadata configuration
        metadata: dict[str, Any] = {
            "exercise_type": lesson.modality,
        }

        if lesson.modality == "code":
            metadata["language"] = lesson.language
            (lesson_dir / "main.py").write_text(lesson.starter_code, encoding="utf-8")
            (lesson_dir / "test.py").write_text(lesson.test_code, encoding="utf-8")
            (lesson_dir / "solution.py").write_text(lesson.solution_code, encoding="utf-8")

        elif lesson.modality == "spreadsheet":
            metadata["exercise_type"] = "spreadsheet"
            metadata["google_sheet_id"] = (
                lesson.google_sheet_id or "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            )
            metadata["copy_on_open"] = lesson.copy_on_open

        elif lesson.modality == "drawing":
            metadata["exercise_type"] = "drawing"
            metadata["stroke_color"] = "#e11d48"
            metadata["stroke_width"] = 4
            # Write a valid transparent PNG image file
            (lesson_dir / "question.png").write_bytes(TRANSPARENT_PNG_BYTES)

        (lesson_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return course_path


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

    def execute(
        self,
        topic: str,
        materials: str = "",
        username: str = "",
    ) -> AgenticWorkflowResult:
        """Executes the complete 4-step agentic workflow:

        1. Tool 1: get_learning_intent
        2. Tool 2: get_context_learning
        3. Tool 3: get_platform_content_tools
        4. Tool 4: curate_solveit_course
        5. Materialize to filesystem.
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
        # Step 4: Tool 4 - curate_solveit_course (via LLM or deterministic engine)
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

        # Attempt to consult LLM with the outputs of Tools 1, 2, and 3
        if self.generate_text is not None or self.client is not None:
            try:
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
Available Modalities: {list(platform_tools.modalities.keys())}
Installed Python Sandbox Packages: {platform_tools.installed_sandbox_libraries}

YOUR TASK:
Plan 3 to 5 micro-step lessons applying the Solveit methodology:
1. Toy data (3-5 rows/items, expected output stated before running)
2. Micro-step (1-3 logical lines only)
3. Live inspection prompt
4. Curiosity reflection prompt
5. Python code lessons must import only {platform_tools.installed_sandbox_libraries}
6. test_code must import from main (e.g. from main import ...) and assert results.

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
                    completion = self.client.chat.completions.create(
                        model=os.environ.get("LLM_MODEL", "gpt-4o-mini"),
                        messages=[{"role": "user", "content": system_solveit_prompt}],
                    )
                    llm_text = (completion.choices[0].message.content or "").strip()

                if llm_text:
                    parsed_plan = _extract_json_from_llm(llm_text)
                    course_title = parsed_plan.get("title", course_title)
                    course_desc = parsed_plan.get("description", course_desc)
                    narrative_arc = parsed_plan.get("narrative_arc", narrative_arc)
                    raw_lessons = parsed_plan.get("lessons", [])
            except Exception:
                # LLM rate-limited or unavailable; use deterministic Solveit synthesis
                raw_lessons = []

        if not raw_lessons:
            raw_lessons = build_fallback_solveit_lessons(intent, learner_ctx, platform_tools)

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

        # -------------------------------------------------------------------
        # Materialization: Write course to courses/ directory
        # -------------------------------------------------------------------
        written_path = materialize_curated_course(curated, self.courses_dir)

        traces.append(
            ToolTrace(
                tool_name="materialize_course",
                status="completed",
                input_summary=f"Destination: {written_path.name}",
                output_summary=f"Successfully materialized {curated.lesson_count} lesson files under courses/{written_path.name}",
                details={"course_slug": written_path.name},
            )
        )

        return AgenticWorkflowResult(
            slug=written_path.name,
            title=curated.title,
            description=curated.description,
            narrative_arc=curated.narrative_arc,
            lesson_count=curated.lesson_count,
            lessons=curated.lessons,
            tool_traces=traces,
            grounded_in=curated.grounded_in,
            solveit_compliance=curated.solveit_compliance,
        )
