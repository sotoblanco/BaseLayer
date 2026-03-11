from google import genai
import os
import json
import re
from typing import Dict, Any

class AIService:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("Warning: GEMINI_API_KEY not found in environment variables.")
        else:
            self.client = genai.Client(api_key=api_key)

    def generate_exercise(self, prompt: str, language: str = "python") -> Dict[str, Any]:
        """
        Generates a coding exercise based on a prompt.
        Returns a dictionary with title, lesson, assignment, starting_code, and test_cases.
        """
        if not hasattr(self, "client"):
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
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_prompt
            )
            text = response.text.strip()
            
            # Try to find JSON within code blocks first
            json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Fallback: try to find the first '{' and last '}'
                first_brace = text.find("{")
                last_brace = text.rfind("}")
                if first_brace != -1 and last_brace != -1:
                    json_str = text[first_brace : last_brace + 1]
                else:
                    json_str = text

            return json.loads(json_str)
        except Exception as e:
            print(f"Error parsing AI response: {e}")
            # print(f"Raw response: {response.text}") # response might not exist if generation failed
            return {"error": f"Failed to generate valid exercise data: {str(e)}"}

    def chat(self, message: str, context: str = "", understanding_level: str = "Intermediate") -> str:
        """
        Chat with the AI about implementation details.
        """
        if not hasattr(self, "client"):
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
            "Bloom's Taxonomy": "You are an expert ML teacher using Bloom’s Taxonomy: Create responses that progress through Bloom’s levels: remember, understand, apply, analyze, evaluate, and create. Guide my learning."
        }
        
        level_instruction = level_prompts.get(understanding_level, level_prompts["Intermediate"])

        full_prompt = f"{system_prompt}\n\nUnderstanding Level Context:\n{level_instruction}\n\nContext: {context}\n\nUser: {message}"
        try:
            # Using the new SDK's generate_content for single turn, or we could use chats.create for multi-turn
            # For now, sticking to single turn as per original implementation
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_prompt
            )
            return response.text
        except Exception as e:
            return f"Error communicating with AI: {str(e)}"

ai_service = AIService()
