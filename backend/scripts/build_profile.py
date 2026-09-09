"""Interactive and CLI learner profile builder for BaseLayer.

Builds or recalibrates data/learners/{username}/LEARNING.md directly
from the terminal by prompting situational questions without forcing
arbitrary choices between code, spreadsheets, or drawings.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

try:
    from backend.learner_profile import (
        LearnerQuestionnaire,
        apply_questionnaire_profile,
        get_learners_data_dir,
    )
except ModuleNotFoundError:
    from learner_profile import (
        LearnerQuestionnaire,
        apply_questionnaire_profile,
        get_learners_data_dir,
    )


def _format_choice_prompt(prompt: str, options: list[str], default_idx: int) -> None:
    """Prints numbered choices for terminal selection."""
    print(f"\n{prompt}")
    for idx, opt in enumerate(options, 1):
        suffix = " (default)" if idx - 1 == default_idx else ""
        print(f"  [{idx}] {opt}{suffix}")


def _prompt_choice(prompt: str, options: list[str], default_idx: int = 0) -> int:
    """Prompt the user in terminal with numbered options and return chosen index."""
    _format_choice_prompt(prompt, options, default_idx)
    try:
        choice = input(f"Select option [1-{len(options)}] (Enter for default): ").strip()
        if not choice:
            return default_idx
        val = int(choice)
        return (val - 1) if 1 <= val <= len(options) else default_idx
    except (ValueError, EOFError):
        return default_idx


def _prompt_situational_pedagogy() -> tuple[str, str, str, str]:
    """Prompts situational guidance when stuck."""
    options = [
        "Deconstruct into bite-sized micro-steps with instant verification (Solveit)",
        "Ask guiding Socratic questions to help me isolate the flaw myself (Socratic)",
        "State technical constraints, edge cases, and rules directly (Direct)",
        "Provide scaffolded code templates with clear TODO slots (Guided Scaffolding)",
    ]
    idx = _prompt_choice(
        "Situation 2: When a test fails or you hit an error, what kind of guidance helps you most?",
        options,
        default_idx=0,
    )
    styles = ["solveit", "socratic", "direct", "solveit"]
    formats = ["micro_steps", "macro_challenges", "micro_steps", "guided_completion"]
    hints = ["toy_example", "guiding_question", "direct_explanation", "toy_example"]
    return styles[idx], formats[idx], hints[idx], options[idx]


def _prompt_situational_tone() -> tuple[str, str, str]:
    """Prompts explanation tone and depth."""
    options = [
        "Pragmatic developer peer: realistic, unhurried, focused on engineering trade-offs",
        "Ultra-concise: bullet points, high signal density, zero preamble",
        "Thorough first-principles: deep contextual clarity and underlying math",
    ]
    idx = _prompt_choice(
        "Situation 3: How should explanations and reviews be phrased?",
        options,
        default_idx=0,
    )
    tones = ["pragmatic", "concise", "direct"]
    paces = ["unhurried", "sprint", "unhurried"]
    expl_lengths = ["short", "short", "thorough"]
    return tones[idx], paces[idx], expl_lengths[idx]


def _prompt_tool_preference() -> list[str]:
    """Prompts optional tool preference or defaults to all tools."""
    tool_options = [
        "Use all tools together (Recommended: Code, Spreadsheets, & Canvas)",
        "Lead primarily with Code",
        "Lead primarily with Interactive Spreadsheets",
        "Lead primarily with Visual Drawing Canvas",
    ]
    tool_idx = _prompt_choice(
        "Tool Focus (Optional): All learning tools are active by default. Choose a preference or skip:",
        tool_options,
        default_idx=0,
    )
    modality_map = {
        0: ["code", "spreadsheet", "drawing"],
        1: ["code"],
        2: ["spreadsheet"],
        3: ["drawing"],
    }
    return modality_map.get(tool_idx, ["code", "spreadsheet", "drawing"])


def prompt_interactive_questionnaire(default_username: str = "Learner") -> tuple[str, LearnerQuestionnaire]:
    """Interactively prompts situational questions in terminal and returns questionnaire answers."""
    print("=" * 60)
    print("BaseLayer Local Learner Profile Setup")
    print("=" * 60)
    print("Configure your personal tutor style, modalities, and hints.\n")

    try:
        username_input = input(f"Enter your handle or name [{default_username}]: ").strip()
    except EOFError:
        username_input = ""
    username = username_input or default_username

    default_goal = "Understand foundational AI and systems from first principles"
    try:
        goal_input = input(f"Learning focus/goal [{default_goal}]: ").strip()
    except EOFError:
        goal_input = ""
    goal = goal_input or default_goal

    # Situation 1: Complex Concept Click
    s1_options = [
        "Live execution: trace concrete values and numbers step-by-step before abstract math",
        "First principles: deconstruct structural invariants, rules, and system boundaries",
        "Experimental tinkering: rapid trial-and-error with immediate verification feedback",
        "Intuitive narrative: relate mechanics to physical analogies before syntax",
    ]
    s1_idx = _prompt_choice(
        "Situation 1: When learning an intricate algorithm or systems concept, what helps it click fastest?",
        s1_options,
        default_idx=0,
    )
    unblock_map = {0: "visual_numbers", 1: "breakdown_code", 2: "breakdown_code", 3: "analogy_story"}
    primary_unblock = unblock_map.get(s1_idx, "visual_numbers")

    # Situations 2 & 3 & Tool Focus
    tutor_style, exercise_format, hint_pref, _ = _prompt_situational_pedagogy()
    tone, pace, explanation_length = _prompt_situational_tone()
    preferred_modalities = _prompt_tool_preference()

    answers = LearnerQuestionnaire(
        unblock_strategies=[primary_unblock],  # type: ignore[list-item]
        preferred_modalities=preferred_modalities,
        exercise_format=exercise_format,  # type: ignore[arg-type]
        hint_preference=hint_pref,  # type: ignore[arg-type]
        explanation_length=explanation_length,  # type: ignore[arg-type]
        tutor_style=tutor_style,  # type: ignore[arg-type]
        tone=tone,  # type: ignore[arg-type]
        pace=pace,  # type: ignore[arg-type]
        goal=goal,
        preferred_ui="light",
        understanding_level="intermediate",
    )
    return username, answers


def _parse_cli_args(args: list[str] | None = None) -> argparse.Namespace:
    """Parses command line flags for profile generation."""
    parser = argparse.ArgumentParser(
        description="Build or calibrate a local BaseLayer learner profile."
    )
    parser.add_argument("--username", help="Learner handle or username", default=None)
    parser.add_argument("--goal", help="Learning goal or focus", default=None)
    parser.add_argument(
        "--tutor-style",
        choices=["solveit", "socratic", "direct", "blooms"],
        default=None,
        help="Explicit tutor pedagogy override",
    )
    parser.add_argument(
        "--tone",
        choices=["direct", "pragmatic", "concise"],
        default=None,
        help="Explanation tone override",
    )
    parser.add_argument(
        "--modalities",
        nargs="+",
        choices=["code", "spreadsheet", "drawing", "text"],
        default=None,
        help="Enabled learning modalities",
    )
    parser.add_argument(
        "--non-interactive",
        action="store_true",
        help="Run without interactive prompts, using defaults or passed flags.",
    )
    return parser.parse_args(args)


def _build_non_interactive_answers(parsed_args: argparse.Namespace) -> tuple[str, LearnerQuestionnaire]:
    """Constructs questionnaire answers from CLI flags."""
    username = parsed_args.username or "Learner"
    goal = parsed_args.goal or "Understand foundational AI and systems from first principles"
    t_style = parsed_args.tutor_style or "solveit"
    hint_pref = (
        "guiding_question"
        if t_style == "socratic"
        else ("direct_explanation" if t_style == "direct" else "toy_example")
    )
    answers = LearnerQuestionnaire(
        goal=goal,
        tutor_style=t_style,
        tone=parsed_args.tone or "pragmatic",
        preferred_modalities=parsed_args.modalities or ["code", "spreadsheet", "drawing"],
        exercise_format="micro_steps",
        hint_preference=hint_pref,
        explanation_length="short",
        pace="unhurried",
        preferred_ui="light",
        understanding_level="intermediate",
    )
    return username, answers


def _print_profile_summary(profile_file: Path, username: str, parsed: dict[str, Any], goal: str) -> None:
    """Prints a clean confirmation summary to the console."""
    print("\n" + "=" * 60)
    print("Learner Profile Generated Successfully")
    print("=" * 60)
    print(f"File:         {profile_file}")
    print(f"Learner:      {username}")
    print(f"Tutor Style:  {parsed['frontmatter']['tutor_style']}")
    print(f"Tone:         {parsed['frontmatter']['tone']}")
    print(f"Format:       {parsed['frontmatter']['exercise_format']}")
    print(f"Modalities:   {', '.join(parsed['frontmatter']['preferred_modalities'])}")
    print(f"Goal:         {goal}")
    print("=" * 60)
    print("BaseLayer will automatically use this profile on your machine.\n")


def build_profile_cli(args: list[str] | None = None, base_dir: Path | None = None) -> int:
    """CLI entrypoint for creating or updating a learner profile."""
    parsed_args = _parse_cli_args(args)

    if parsed_args.non_interactive or parsed_args.username:
        username, answers = _build_non_interactive_answers(parsed_args)
    else:
        username, answers = prompt_interactive_questionnaire()

    _, parsed = apply_questionnaire_profile(username, answers, base_dir=base_dir)

    target_dir = base_dir or get_learners_data_dir()
    profile_file = target_dir / username / "LEARNING.md"
    _print_profile_summary(profile_file, username, parsed, answers.goal)
    return 0


if __name__ == "__main__":
    sys.exit(build_profile_cli())
