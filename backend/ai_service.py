import json
import os
import re
from typing import Any

from learning_paths import LearningPath, parse_json_response
from llm import (
    LLMSettings,
    apply_settings_to_env,
    build_client,
    load_settings,
    validate_settings,
)


class AIService:
    def __init__(self):
        self.client = None
        self.settings: LLMSettings = load_settings()
        if self.settings.is_configured:
            self._connect(self.settings)
        else:
            print("AI is optional: no LLM provider configured.")

    def _connect(self, settings: LLMSettings) -> None:
        self.settings = settings
        apply_settings_to_env(settings)
        try:
            self.client = build_client(settings)
        except Exception as exc:
            print(f"Warning: could not create LLM client: {exc}")
            self.client = None

    def configure(
        self,
        provider: str,
        api_key: str = "",
        model: str | None = None,
        api_base: str | None = None,
    ) -> LLMSettings:
        settings = validate_settings(provider, api_key=api_key, model=model, api_base=api_base)
        self._connect(settings)
        return settings

    def configure_key(self, api_key: str):
        """Backward-compatible helper: treat a bare key as Gemini (AI Studio)."""
        provider = self.settings.provider or "gemini"
        self.configure(provider=provider, api_key=api_key, model=self.settings.model or None)

    @property
    def is_configured(self) -> bool:
        return self.client is not None and self.settings.is_configured

    @property
    def has_key(self) -> bool:
        return self.settings.has_key or bool(
            os.environ.get("LLM_API_KEY")
            or os.environ.get("OPENAI_API_KEY")
            or os.environ.get("GEMINI_API_KEY")
        )

    def complete(self, prompt: str) -> str:
        if not self.is_configured:
            raise RuntimeError("AI service not configured")
        response = self.client.chat.completions.create(
            model=self.settings.model,
            messages=[{"role": "user", "content": prompt}],
        )
        return (response.choices[0].message.content or "").strip()

    def _complete_multimodal(self, prompt: str, images: list[tuple[bytes, str]]) -> str:
        import base64 as b64

        if not self.is_configured:
            raise RuntimeError("AI service not configured")

        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for data, mime in images:
            encoded = b64.b64encode(data).decode("utf-8")
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{encoded}"},
                }
            )

        response = self.client.chat.completions.create(
            model=self.settings.model,
            messages=[{"role": "user", "content": content}],
        )
        return (response.choices[0].message.content or "").strip()

    def generate_exercise(self, prompt: str, language: str = "python") -> dict[str, Any]:
        if not self.is_configured:
            return {"error": "AI service not configured"}

        full_prompt = f"""
        You are an expert technical coding tutor. Your goal is to create a detailed, high-quality coding lesson and assignment for the topic: "{prompt}".
        The target programming language is: **{language}**.

        **CRITICAL INSTRUCTION**: You MUST write code ONLY in **{language}**.
        - If {language} is "rust", you MUST use Rust syntax (fn, let, mut, impl). NEVER use Python syntax (def, indentation blocks).
        - If {language} is "python", use Python syntax.

        Please follow these guidelines:
        1.  **Single Learning Objective**: Focus on teaching ONE specific concept clearly.
        2.  **Explanation (Extremely Helpful)**:
            *   Provide a clear, concept-first explanation.
            *   **Examples**: Provide *generic* syntax examples that clearly show HOW to use the feature. (e.g., if teaching 'structs', show a generic struct definition).
            *   **Why**: Explain *why* this feature exists and when to use it.
            *   Keep the tone encouraging ("SocratiQ the Wise").
        3.  **Assignment**:
            *   Describe a specific, actionable task.
            *   Be precise about what functions/structs need to be implemented.
        4.  **Code Structure (Strict Compliance)**:
            *   `starting_code`:
                *   Must range from a simple function signature to a partial implementation (checking user level, assume beginner/intermediate).
                *   **RUST**: Must NOT contain a `main` function. Just the `pub fn solve(...)` or similar library code.
                *   Use `todo!()` macros in Rust or `pass` in Python for gaps.
            *   `test_cases`:
                *   **RUST**: MUST contain a full `fn main() {{ ... }}` that calls the user's function and asserts results.
                *   **PYTHON**: Valid Python scripts with `assert`.

        Provide the response in raw JSON format (no markdown code blocks) with the following structure:
        {{
            "title": "Lesson Title",
            "explanation": "Markdown string for the explanation",
            "assignment": "Markdown string for the assignment instructions",
            "starting_code": "Code string for the user's editor",
            "test_cases": "Code string for the hidden test runner"
        }}
        """
        try:
            text = self.complete(full_prompt)
            json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                first_brace = text.find("{")
                last_brace = text.rfind("}")
                if first_brace != -1 and last_brace != -1:
                    json_str = text[first_brace : last_brace + 1]
                else:
                    json_str = text
            return json.loads(json_str)
        except Exception as e:
            print(f"Error parsing AI response: {e}")
            return {"error": f"Failed to generate valid exercise data: {str(e)}"}

    def run_agentic_course_builder(
        self,
        topic: str,
        materials: str = "",
        username: str = "",
        courses_dir: Any = None,
    ) -> Any:
        from agentic_workflow import AgenticCourseWorkflow

        workflow = AgenticCourseWorkflow(
            generate_text=self.complete if self.is_configured else None,
            courses_dir=courses_dir,
        )
        return workflow.execute(topic=topic, materials=materials, username=username)

    def plan_learning_path(self, topic: str, context: str) -> LearningPath:
        if not self.is_configured:
            raise RuntimeError("AI service not configured")

        prompt = f"""
You are designing a hands-on programming course for BaseLayer.
The learner asked: {topic}

Use the supplied platform and learner material as evidence. Do not invent imports
that are unavailable in the platform capabilities. Return raw JSON only.

Create 3 to 6 lessons. Each lesson must teach exactly one concept and follow
Solveit: tiny toy data, expected result before execution, a micro-task worth 1-3
logical lines, an inspect prompt, and a runnable Python starter/test/solution.
Never put the solution in starter_code. Tests must assert the toy behavior and
must pass against solution_code. Because BaseLayer runs `test.py` beside the
learner's `main.py`, every test_code must import the learner's public function
or class from `main` before calling it. Prefer simple examples that fit in
working memory.

JSON shape:
{{
  "title": "...",
  "description": "...",
  "lessons": [{{
    "title": "...",
    "objective": "...",
    "toy_data": "...",
    "expected_result": "...",
    "micro_task": "...",
    "inspect_prompt": "...",
    "starter_code": "...",
    "test_code": "...",
    "solution_code": "...",
    "source_refs": ["..."],
    "skills": ["short skill tag"]
  }}]
}}

GROUNDING CONTEXT:
{context}
"""
        try:
            path = LearningPath.model_validate(parse_json_response(self.complete(prompt)))
            return path
        except Exception as exc:
            raise RuntimeError(f"Failed to create a valid learning path: {exc}") from exc

    def chat(
        self, message: str, context: str = "", understanding_level: str = "Intermediate"
    ) -> str:
        if not self.is_configured:
            return "AI service not configured."

        system_prompt = """
        You are SocratiQ, an expert AI coding tutor.

        Your Goal: Help the student understand the current exercise and solve the problem WITHOUT giving away the answer.

        Guidelines:
        1.  **Persona**: Be encouraging, clear, and highly practical. Avoid magical jargon.
        2.  **No Solutions**: Never write the full code solution. If asked, explain the *logic* or give a small syntax example unrelated to the exact solution.
        3.  **Socratic Method**: Ask guiding questions to help them realize the answer.
        4.  **Use Context**: Always integrate the specific details of the exercise description and the student's current code provided in the context into your guidance.
        """

        level_prompts = {
            "Beginner": "You are conversing with a Beginner learner: Focus on foundational concepts, definitions, and straightforward applications in machine learning systems, suitable for learners with little to no prior knowledge.",
            "Intermediate": "You are conversing with an Intermediate learner: Emphasize problem-solving, system design, and practical implementations, targeting learners with a basic understanding of machine learning principles.",
            "Advanced": "You are conversing with an Advanced learner: Challenge learners to analyze, innovate, and optimize complex machine learning systems, requiring deep expertise and a holistic grasp of advanced techniques.",
            "Bloom's Taxonomy": "You are an expert ML teacher using Bloom’s Taxonomy: Create responses that progress through Bloom’s levels: remember, understand, apply, analyze, evaluate, and create. Guide my learning.",
            "Solveit": "You are a Solveit pair programming navigator (Fast.ai / Answer.AI): Guide the learner through 1 to 3 line micro-steps on small toy data (3-5 items). Prompt them to run and inspect the intermediate output. Never write the complete solution. End with exactly one Socratic question.",
        }

        level_instruction = level_prompts.get(understanding_level, level_prompts["Intermediate"])
        full_prompt = (
            f"{system_prompt}\n\nUnderstanding Level Context:\n{level_instruction}"
            f"\n\nContext: {context}\n\nUser: {message}"
        )
        try:
            return self.complete(full_prompt)
        except Exception as e:
            return f"Error communicating with AI: {str(e)}"

    def evaluate_drawing(
        self,
        instructions: str,
        question_img_bytes: bytes,
        sketch_img_bytes: bytes,
        solution_img_bytes: bytes | None = None,
    ) -> dict[str, Any]:
        if not self.is_configured:
            return {"error": "AI service not configured"}

        solution_ref_text = ""
        if solution_img_bytes:
            solution_ref_text = (
                "\n3. Look at the THIRD image provided (the 'solution.png' reference answer)."
            )

        prompt = f"""
        You are an expert tutor grading a visual exercise.

        **Instructions for the student:**
        {instructions}

        **Your Task:**
        1. Look at the FIRST image provided (the background diagram 'question.png').
        2. Look at the SECOND image provided (the student's drawing 'sketch.png').{solution_ref_text}
        4. Evaluate if the student correctly followed the instructions.
        5. **Flexibility is Key**: If the student demonstrates the correct *idea* or *intent*, even if the drawing is imperfect, they should PASS.
        6. Focus on the core concept being taught. Minor aesthetic issues or slight inaccuracies that don't compromise the understanding of the concept should be ignored.
        7. {"If a solution image was provided, ensure the student's sketch matches the intent of the solution." if solution_img_bytes else ""}
        8. Be encouraging and focus on what they got right.

        Provide the result in raw JSON format (no markdown) with:
        {{
            "passed": boolean,
            "score": float (0.0 to 1.0),
            "message": "Feedback for the student"
        }}
        """

        try:
            images = [
                (question_img_bytes, "image/png"),
                (sketch_img_bytes, "image/png"),
            ]
            if solution_img_bytes:
                images.append((solution_img_bytes, "image/png"))

            text = self._complete_multimodal(prompt, images)
            json_match = re.search(r"(\{.*?\})", text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))

            return {
                "passed": "pass" in text.lower() or "correct" in text.lower(),
                "score": 1.0 if "pass" in text.lower() else 0.0,
                "message": text,
            }
        except Exception as e:
            print(f"Error in evaluate_drawing: {e}")
            return {"error": f"AI evaluation failed: {str(e)}"}


ai_service = AIService()
