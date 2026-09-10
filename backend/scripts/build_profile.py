"""Interactive and CLI learner profile builder for BaseLayer.

Builds or recalibrates data/learners/{username}/LEARNING.md directly
from the terminal by prompting situational questions without forcing
arbitrary choices between code, spreadsheets, or drawings.

With ``--onboard`` it runs the full first-run wizard: workspace init
(``~/.baselayer``), learner profile (LEARNING.md), global teaching
defaults (INSTRUCTOR.md), and AI provider key setup (.env).
"""

from __future__ import annotations

import argparse
import getpass
import json
import sys
from datetime import datetime, timezone
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

DEFAULT_WORKSPACE = Path.home() / ".baselayer"
WORKSPACE_VERSION = 1


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


def prompt_interactive_questionnaire(
    default_username: str = "Learner",
) -> tuple[str, LearnerQuestionnaire]:
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
    unblock_map = {
        0: "visual_numbers",
        1: "breakdown_code",
        2: "breakdown_code",
        3: "analogy_story",
    }
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
    parser.add_argument(
        "--onboard",
        action="store_true",
        help="Full first-run wizard: workspace + LEARNING.md + INSTRUCTOR.md + AI key.",
    )
    parser.add_argument(
        "--workspace",
        default=None,
        help="Workspace root (default: ~/.baselayer). Holds .env, INSTRUCTOR.md, MEMORY.md, data/, courses/.",
    )
    parser.add_argument(
        "--instructor-style",
        choices=["solveit", "socratic", "direct", "blooms"],
        default=None,
        help="Global default tutor style for INSTRUCTOR.md",
    )
    parser.add_argument(
        "--instructor-tone",
        choices=["direct", "pragmatic", "concise"],
        default=None,
        help="Global default tone for INSTRUCTOR.md",
    )
    parser.add_argument(
        "--instructor-pace",
        choices=["unhurried", "sprint", "mixed"],
        default=None,
        help="Global default pace for INSTRUCTOR.md",
    )
    parser.add_argument(
        "--instructor-explanation",
        choices=["short", "thorough"],
        default=None,
        help="Global default explanation depth for INSTRUCTOR.md",
    )
    parser.add_argument(
        "--instructor-format",
        choices=["micro_steps", "macro_challenges", "guided_completion"],
        default=None,
        help="Global default exercise format for INSTRUCTOR.md",
    )
    parser.add_argument(
        "--instructor-hints",
        choices=["toy_example", "guiding_question", "direct_explanation"],
        default=None,
        help="Global default hint style for INSTRUCTOR.md",
    )
    parser.add_argument(
        "--provider",
        default=None,
        help="AI provider id (e.g. gemini, ollama, openai). Triggers AI key setup.",
    )
    parser.add_argument("--api-key", default=None, help="API key for the provider (if needed).")
    parser.add_argument("--model", default=None, help="Model override for the provider.")
    parser.add_argument("--api-base", default=None, help="Base URL override (custom providers).")
    parser.add_argument(
        "--skip-ai",
        action="store_true",
        help="Skip AI provider setup during onboard.",
    )
    return parser.parse_args(args)


def _resolve_hint_preference(tutor_style: str) -> str:
    if tutor_style == "socratic":
        return "guiding_question"
    if tutor_style == "direct":
        return "direct_explanation"
    return "toy_example"


def _extract_non_interactive_basics(parsed_args: argparse.Namespace) -> tuple[str, str]:
    username = parsed_args.username or "Learner"
    goal = parsed_args.goal or "Understand foundational AI and systems from first principles"
    return username, goal


def _build_non_interactive_answers(
    parsed_args: argparse.Namespace,
) -> tuple[str, LearnerQuestionnaire]:
    """Constructs questionnaire answers from CLI flags."""
    username, goal = _extract_non_interactive_basics(parsed_args)
    t_style = parsed_args.tutor_style or "solveit"
    modalities = parsed_args.modalities or ["code", "spreadsheet", "drawing"]
    answers = LearnerQuestionnaire(
        goal=goal,
        tutor_style=t_style,
        tone=parsed_args.tone or "pragmatic",
        preferred_modalities=modalities,
        exercise_format="micro_steps",
        hint_preference=_resolve_hint_preference(t_style),
        explanation_length="short",
        pace="unhurried",
        preferred_ui="light",
        understanding_level="intermediate",
    )
    return username, answers


def _print_profile_summary(
    profile_file: Path, username: str, parsed: dict[str, Any], goal: str
) -> None:
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


def _persist_active_learner(username: str) -> None:
    try:
        from backend.auth import set_active_learner_name

        set_active_learner_name(username)
    except Exception:
        try:
            from auth import set_active_learner_name

            set_active_learner_name(username)
        except Exception:
            pass


def _resolve_cli_answers(
    parsed_args: argparse.Namespace,
) -> tuple[str, LearnerQuestionnaire]:
    if parsed_args.non_interactive or parsed_args.username:
        return _build_non_interactive_answers(parsed_args)
    return prompt_interactive_questionnaire()


# ---------------------------------------------------------------------------
# Onboard wizard: workspace, INSTRUCTOR.md, AI key setup
# ---------------------------------------------------------------------------


def resolve_workspace(explicit: str | None, base_dir: Path | None = None) -> Path:
    """Resolve the workspace root for onboard mode.

    Explicit --workspace wins; a passed base_dir (tests, embedding) is treated
    as the workspace root; otherwise ~/.baselayer.
    """
    if explicit:
        return Path(explicit).expanduser()
    if base_dir is not None:
        return Path(base_dir)
    return DEFAULT_WORKSPACE


MEMORY_SKELETON = """# Memory — BaseLayer local studio

## Active learner
<!-- Set by `baselayer onboard`. -->

## Course progress
<!-- Updated automatically as lessons complete: course, position, XP. -->

## Notes
<!-- Durable facts worth remembering across sessions. -->
"""


def init_workspace(workspace: Path) -> dict[str, Path]:
    """Create the workspace tree and seed files (idempotent)."""
    learners_dir = workspace / "data" / "learners"
    courses_dir = workspace / "courses"
    learners_dir.mkdir(parents=True, exist_ok=True)
    courses_dir.mkdir(parents=True, exist_ok=True)

    config_path = workspace / "config.json"
    if not config_path.is_file():
        config_path.write_text(
            json.dumps(
                {
                    "version": WORKSPACE_VERSION,
                    "workspace": str(workspace),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    memory_path = workspace / "MEMORY.md"
    if not memory_path.is_file():
        memory_path.write_text(MEMORY_SKELETON, encoding="utf-8")

    env_path = workspace / ".env"
    if not env_path.is_file():
        env_path.write_text(
            "# BaseLayer local workspace env (managed by `baselayer onboard`)\n", encoding="utf-8"
        )

    return {
        "workspace": workspace,
        "learners_dir": learners_dir,
        "courses_dir": courses_dir,
        "config_path": config_path,
        "memory_path": memory_path,
        "env_path": env_path,
        "instructor_path": workspace / "INSTRUCTOR.md",
    }


INSTRUCTOR_DEFAULTS = {
    "tutor_style": "solveit",
    "tone": "pragmatic",
    "pace": "unhurried",
    "explanation_length": "short",
    "exercise_format": "micro_steps",
}


def _render_instructor_md(settings: dict[str, Any]) -> str:
    modalities = settings.get("modality_order", ["drawing", "spreadsheet", "code"])
    modality_lines = "\n".join(f"  - {mod}" for mod in modalities)
    return f"""---
# BaseLayer Instructor Defaults (global teaching defaults)
# Per-learner overrides live in data/learners/{{username}}/LEARNING.md
# and always win over these defaults.

tutor_style: {settings["tutor_style"]}
tone: {settings["tone"]}
pace: {settings["pace"]}
explanation_length: {settings["explanation_length"]}
exercise_format: {settings["exercise_format"]}
hint_preference: {settings["hint_preference"]}
modality_order:
{modality_lines}
---

# Instructor defaults

## Persona
{settings["persona"]}

## Lesson contract
Every generated lesson follows Topic -> Explanation -> Example -> Assignment.
Lesson 1 is always a foundations explainer, never code-only for beginners.
Micro-steps stay at 1-3 logical lines; sample data stays concrete (3-5 rows/items).

## Tone rules
- No "It is not X, but Y" contrast framing.
- No rhetorical questions, no academic filler transitions.
- No cheerleading or exclamation-mark hype.
- State concrete behaviors: what the input is, what breaks, the exact line to handle it.
"""


def _prompt_instructor_settings() -> dict[str, Any]:
    """Interactively collect global teaching defaults."""
    print("\n" + "-" * 60)
    print("Instructor defaults (INSTRUCTOR.md) — how every course should teach.")
    print("-" * 60)
    style_idx = _prompt_choice(
        "Default tutor style for new courses?",
        [
            "Solveit: sample data, 1-3 line micro-steps, run & inspect",
            "Socratic: guiding questions that make you discover the answer",
            "Direct: clear rule-first explanations with minimal preamble",
            "Blooms: climb from remember & understand up to evaluate & create",
        ],
        default_idx=0,
    )
    styles = ["solveit", "socratic", "direct", "blooms"]
    tutor_style = styles[style_idx]

    tone_idx = _prompt_choice(
        "Default tone?",
        [
            "Pragmatic developer peer (default)",
            "Direct technical manual",
            "Ultra-concise, code-first",
        ],
        default_idx=0,
    )
    tones = ["pragmatic", "direct", "concise"]
    personas = [
        "Pragmatic developer peer. Plain-spoken about bugs, dry wit on edge cases, no forced humor.",
        "Neutral technical manual. Factual, concise, zero preamble.",
        "Ultra-concise code-first guide. Minimal text, maximum signal.",
    ]

    pace_idx = _prompt_choice(
        "Default pace?",
        ["Unhurried step-by-step (default)", "Sprint (rapid execution)", "Mixed"],
        default_idx=0,
    )
    paces = ["unhurried", "sprint", "mixed"]

    depth_idx = _prompt_choice(
        "Default explanation depth?",
        ["Concise essentials (default)", "Thorough background with analogies"],
        default_idx=0,
    )

    return {
        "tutor_style": tutor_style,
        "tone": tones[tone_idx],
        "persona": personas[tone_idx],
        "pace": paces[pace_idx],
        "explanation_length": "thorough" if depth_idx == 1 else "short",
        "exercise_format": "micro_steps",
        "hint_preference": _resolve_hint_preference(tutor_style),
        "modality_order": ["drawing", "spreadsheet", "code"],
    }


def build_instructor_settings(parsed_args: argparse.Namespace, interactive: bool) -> dict[str, Any]:
    """Merge instructor flags over defaults (interactive prompts when allowed)."""
    if interactive:
        settings = _prompt_instructor_settings()
    else:
        settings = {
            **INSTRUCTOR_DEFAULTS,
            "persona": "Pragmatic developer peer. Plain-spoken about bugs, dry wit on edge cases, no forced humor.",
            "hint_preference": _resolve_hint_preference(
                parsed_args.instructor_style or INSTRUCTOR_DEFAULTS["tutor_style"]
            ),
            "modality_order": ["drawing", "spreadsheet", "code"],
        }
    overrides = {
        "tutor_style": parsed_args.instructor_style,
        "tone": parsed_args.instructor_tone,
        "pace": parsed_args.instructor_pace,
        "explanation_length": parsed_args.instructor_explanation,
        "exercise_format": parsed_args.instructor_format,
        "hint_preference": parsed_args.instructor_hints,
    }
    for key, val in overrides.items():
        if val:
            settings[key] = val
    if parsed_args.instructor_style and not parsed_args.instructor_hints:
        settings["hint_preference"] = _resolve_hint_preference(parsed_args.instructor_style)
    return settings


def write_instructor_md(path: Path, settings: dict[str, Any]) -> Path:
    """Write global teaching defaults (overwrite: onboard owns this file)."""
    path.write_text(_render_instructor_md(settings), encoding="utf-8")
    return path


def _ensure_backend_importable() -> None:
    """Make both `backend.*` and bare (`llm`, `ai_service`) imports work.

    The wizard runs as `python -m backend.scripts.build_profile` (repo root on
    sys.path, backend/ is not) while backend modules import each other bare
    (`from llm import ...`, assuming backend/ on sys.path). Without this, any
    interpreter without bespoke setup crashes at the AI step.
    """
    here = Path(__file__).resolve()
    backend_dir = here.parent.parent  # .../backend
    repo_root = backend_dir.parent
    for entry in (str(repo_root), str(backend_dir)):
        if entry not in sys.path:
            sys.path.insert(0, entry)


def _lazy_llm() -> tuple[Any, Any, Any]:
    """Import LLM helpers without pulling the web stack."""
    _ensure_backend_importable()
    try:
        from backend.llm import providers_public, validate_settings
    except ModuleNotFoundError:
        from llm import providers_public, validate_settings
    try:
        from backend.ai_service import ai_service
    except ModuleNotFoundError:
        from ai_service import ai_service
    return providers_public, validate_settings, ai_service


def _upsert_env(env_path: Path, mapping: dict[str, str]) -> None:
    """Write KEY=value pairs into an .env file, replacing existing keys."""
    import re

    content = env_path.read_text(encoding="utf-8") if env_path.is_file() else ""
    for key, value in mapping.items():
        pattern = rf"^\s*(?:export\s+)?{re.escape(key)}=.*$"
        replacement = f"{key}={value}"
        if re.search(pattern, content, flags=re.MULTILINE):
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        else:
            if content and not content.endswith("\n"):
                content += "\n"
            content += f"{replacement}\n"
    env_path.write_text(content, encoding="utf-8")


def _provider_choices() -> list[dict[str, Any]]:
    providers_public, _, _ = _lazy_llm()
    return [dict(p) for p in providers_public()]


def _prompt_ai_settings() -> dict[str, Any] | None:
    """Interactive provider picker + key prompt. Returns None when skipped."""
    print("\n" + "-" * 60)
    print("AI provider — optional. Coding and spreadsheets work without it,")
    print("but course generation and tutoring need a model.")
    print("-" * 60)
    providers = _provider_choices()
    labels = [
        f"{p['name']} ({'needs API key' if p['needs_key'] else 'no key needed'}) — {p.get('blurb', '')}".strip()
        for p in providers
    ]
    labels.append("Skip AI setup for now")
    idx = _prompt_choice("Which provider should power your studio?", labels, default_idx=0)
    if idx >= len(providers):
        return None
    provider = providers[idx]
    api_key = ""
    if provider["needs_key"]:
        try:
            api_key = getpass.getpass(f"Paste your {provider['name']} API key (hidden): ").strip()
        except (EOFError, KeyboardInterrupt):
            api_key = ""
        if not api_key:
            print("No key entered — skipping AI setup. Re-run with --provider/--api-key later.")
            return None
    try:
        model_input = input(f"Model [{provider['default_model']}] (Enter for default): ").strip()
    except EOFError:
        model_input = ""
    return {
        "provider": provider["id"],
        "api_key": api_key,
        "model": model_input or None,
        "api_base": None,
    }


def configure_ai_settings(
    requested: dict[str, Any] | None, env_path: Path
) -> dict[str, Any] | None:
    """Validate (and live-check) AI settings, persist to .env. None = skipped."""
    if not requested:
        return None
    _, validate_settings, ai_service = _lazy_llm()
    try:
        settings = validate_settings(
            provider=requested["provider"],
            api_key=requested.get("api_key", ""),
            model=requested.get("model"),
            api_base=requested.get("api_base"),
        )
    except ValueError as exc:
        print(f"AI setup error: {exc}")
        return None
    ok, message = ai_service.check_connection(settings)
    print(message)
    if not ok:
        print("AI setup NOT saved — fix the issue above and re-run with --provider/--api-key.")
        return None
    mapping = {
        "LLM_PROVIDER": settings.provider,
        "LLM_MODEL": settings.model,
        "LLM_API_KEY": settings.api_key,
    }
    if settings.provider == "gemini" and settings.api_key:
        mapping["GEMINI_API_KEY"] = settings.api_key
    if settings.provider == "openai" and settings.api_key:
        mapping["OPENAI_API_KEY"] = settings.api_key
    if settings.api_base:
        mapping["LLM_API_BASE"] = settings.api_base
    _upsert_env(env_path, mapping)
    return {"provider": settings.provider, "model": settings.model}


def _print_onboard_summary(
    paths: dict[str, Path],
    username: str,
    instructor: dict[str, Any],
    ai: dict[str, Any] | None,
) -> None:
    """Prints the full wizard result with next steps."""
    print("\n" + "=" * 60)
    print("BaseLayer onboard complete")
    print("=" * 60)
    print(f"Workspace:    {paths['workspace']}")
    print(f"Learner:      {paths['learners_dir'] / username / 'LEARNING.md'}")
    print(
        f"Instructor:   {paths['instructor_path']} ({instructor['tutor_style']}, {instructor['tone']})"
    )
    print(f"Memory:       {paths['memory_path']}")
    if ai:
        print(f"AI provider:  {ai['provider']} ({ai['model']}) — saved to {paths['env_path'].name}")
    else:
        print("AI provider:  skipped — coding and spreadsheets still work")
    print("=" * 60)
    print("Next: `baselayer up` to open the studio, `baselayer learn` for the terminal player.\n")


def build_profile_cli(args: list[str] | None = None, base_dir: Path | None = None) -> int:
    """CLI entrypoint for creating or updating a learner profile."""
    parsed_args = _parse_cli_args(args)
    if not parsed_args.onboard:
        # Legacy path: learner profile only, behavior unchanged.
        username, answers = _resolve_cli_answers(parsed_args)
        _, parsed = apply_questionnaire_profile(username, answers, base_dir=base_dir)
        _persist_active_learner(username)

        target_dir = base_dir or get_learners_data_dir()
        profile_file = target_dir / username / "LEARNING.md"
        _print_profile_summary(profile_file, username, parsed, answers.goal)
        return 0

    workspace = resolve_workspace(parsed_args.workspace, base_dir)
    paths = init_workspace(workspace)
    interactive = not parsed_args.non_interactive

    username, answers = _resolve_cli_answers(parsed_args)
    _, parsed = apply_questionnaire_profile(username, answers, base_dir=paths["learners_dir"])
    _persist_active_learner(username)
    profile_file = paths["learners_dir"] / username / "LEARNING.md"
    _print_profile_summary(profile_file, username, parsed, answers.goal)

    instructor = build_instructor_settings(parsed_args, interactive=interactive)
    write_instructor_md(paths["instructor_path"], instructor)

    ai_result: dict[str, Any] | None = None
    if parsed_args.skip_ai:
        print("Skipping AI setup (--skip-ai).")
    elif interactive and not (parsed_args.provider or parsed_args.api_key):
        try:
            ai_result = configure_ai_settings(_prompt_ai_settings(), paths["env_path"])
        except Exception as exc:
            print(f"AI setup unavailable in this Python ({exc}).")
            print("Your profile and instructor files are saved; re-run onboard to add a key later.")
    elif parsed_args.provider or parsed_args.api_key:
        ai_result = configure_ai_settings(
            {
                "provider": parsed_args.provider or "gemini",
                "api_key": parsed_args.api_key or "",
                "model": parsed_args.model,
                "api_base": parsed_args.api_base,
            },
            paths["env_path"],
        )
    else:
        print("Skipping AI setup (non-interactive, no --provider given).")

    _print_onboard_summary(paths, username, instructor, ai_result)
    return 0


if __name__ == "__main__":
    sys.exit(build_profile_cli())
