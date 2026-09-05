"""
Learner Profile Manager for BaseLayer (Issue #23).

Stores learning style, course activity, struggles, and preferences
in human-readable, editable markdown files at:
  data/learners/{username}/LEARNING.md
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field


def get_learners_data_dir() -> Path:
    """Resolve data directory for learners."""
    override = os.environ.get("LEARNERS_DATA_DIR")
    if override:
        return Path(override)
    # Default to data/ directory under repo root
    return Path(__file__).resolve().parent.parent / "data" / "learners"


class LearnerFrontMatter(BaseModel):
    username: str
    updated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    version: int = 1
    preferred_ui: Literal["classic", "light"] = "light"
    tutor_style: Literal["solveit", "socratic", "direct", "blooms"] = "solveit"
    understanding_level: Literal["beginner", "intermediate", "advanced"] = "intermediate"
    preferred_modalities: list[str] = Field(
        default_factory=lambda: ["code", "spreadsheet", "drawing"]
    )
    pace: Literal["unhurried", "sprint", "mixed"] = "unhurried"


class LearnerProfileData(BaseModel):
    frontmatter: LearnerFrontMatter
    snapshot: str = ""
    courses_taken: list[str] = Field(default_factory=list)
    courses_built: list[str] = Field(default_factory=list)
    signals: list[str] = Field(default_factory=list)
    customize_next: list[str] = Field(default_factory=list)


def _default_profile_markdown(username: str) -> str:
    now_iso = datetime.now(timezone.utc).isoformat()
    return f"""---
username: {username}
updated_at: {now_iso}
version: 1
preferred_ui: light
tutor_style: solveit
understanding_level: intermediate
preferred_modalities:
  - code
  - spreadsheet
  - drawing
pace: unhurried
---

# Learning profile — {username}

## Snapshot
Exploratory learner using the Solveit methodology: building from toy data and verified micro-steps.

## Courses taken

## Courses built

## Signals
- Initialized learning profile.

## Customize next
- Default SocratiQ to Solveit tutoring.
- Offer spreadsheet or drawing intuition warm-up for tensor lessons.
"""


def parse_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Extract YAML-like frontmatter and body markdown."""
    match = re.search(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
    if not match:
        raise ValueError("Invalid LEARNING.md: Missing '---' YAML front matter block.")

    fm_text = match.group(1)
    body = match.group(2)

    parsed_fm: dict[str, Any] = {}
    current_list_key: str | None = None

    for line in fm_text.splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#"):
            continue

        if trimmed.startswith("- ") and current_list_key:
            parsed_fm.setdefault(current_list_key, []).append(trimmed[2:].strip())
            continue

        if ":" in line:
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip()

            # Check if this starts a list
            if not val:
                current_list_key = key
                parsed_fm[key] = []
            else:
                current_list_key = None
                # Strip comments
                if " #" in val:
                    val = val.split(" #", 1)[0].strip()
                if val.isdigit():
                    parsed_fm[key] = int(val)
                elif val.lower() in ("true", "false"):
                    parsed_fm[key] = val.lower() == "true"
                else:
                    parsed_fm[key] = val

    return parsed_fm, body


def serialize_frontmatter(fm: LearnerFrontMatter) -> str:
    """Serializes LearnerFrontMatter into YAML frontmatter string."""
    modalities_yaml = "\n".join(f"  - {m}" for m in fm.preferred_modalities)
    return f"""---
username: {fm.username}
updated_at: {fm.updated_at}
version: {fm.version}
preferred_ui: {fm.preferred_ui}
tutor_style: {fm.tutor_style}
understanding_level: {fm.understanding_level}
preferred_modalities:
{modalities_yaml}
pace: {fm.pace}
---"""


def parse_markdown_sections(body: str) -> dict[str, list[str]]:
    """Parses markdown body into a dictionary of section names to lines."""
    sections: dict[str, list[str]] = {}
    current_section: str = "Intro"

    for line in body.splitlines():
        if line.startswith("## "):
            current_section = line[3:].strip()
            sections[current_section] = []
        else:
            sections.setdefault(current_section, []).append(line)

    return sections


def get_profile_path(username: str, base_dir: Path | None = None) -> Path:
    """Returns the path to data/learners/{username}/LEARNING.md."""
    clean_name = re.sub(r"[^a-zA-Z0-9_\-]+", "-", username.strip().lower()).strip("-") or "learner"
    root = base_dir if base_dir is not None else get_learners_data_dir()
    return root / clean_name / "LEARNING.md"


def get_or_create_profile(
    username: str, base_dir: Path | None = None
) -> tuple[str, dict[str, Any]]:
    """Reads LEARNING.md if present, or creates initial file and returns (markdown, parsed)."""
    file_path = get_profile_path(username, base_dir)
    if not file_path.is_file():
        file_path.parent.mkdir(parents=True, exist_ok=True)
        content = _default_profile_markdown(username)
        file_path.write_text(content, encoding="utf-8")

    content = file_path.read_text(encoding="utf-8")
    fm_raw, body = parse_frontmatter(content)
    fm = LearnerFrontMatter.model_validate(fm_raw)
    sections = parse_markdown_sections(body)

    return content, {
        "frontmatter": fm.model_dump(),
        "snapshot": "\n".join(sections.get("Snapshot", [])).strip(),
        "courses_taken": [
            line.strip()
            for line in sections.get("Courses taken", [])
            if line.strip().startswith("- ")
        ],
        "courses_built": [
            line.strip()
            for line in sections.get("Courses built", [])
            if line.strip().startswith("- ")
        ],
        "signals": [
            line.strip()
            for line in sections.get("Signals", [])
            if line.strip().startswith("- ")
        ],
        "customize_next": [
            line.strip()
            for line in sections.get("Customize next", [])
            if line.strip().startswith("- ")
        ],
    }


def update_profile_markdown(
    username: str, markdown: str, base_dir: Path | None = None
) -> tuple[str, dict[str, Any]]:
    """Validates frontmatter and saves user edits to LEARNING.md."""
    fm_raw, body = parse_frontmatter(markdown)
    # Ensure username in frontmatter matches authenticated user
    fm_raw["username"] = username
    fm_raw["updated_at"] = datetime.now(timezone.utc).isoformat()
    fm = LearnerFrontMatter.model_validate(fm_raw)

    file_path = get_profile_path(username, base_dir)
    file_path.parent.mkdir(parents=True, exist_ok=True)

    # Reconstruct with validated frontmatter
    validated_content = f"{serialize_frontmatter(fm)}\n\n{body.strip()}\n"
    file_path.write_text(validated_content, encoding="utf-8")

    return get_or_create_profile(username, base_dir)


def record_learner_event(
    username: str,
    event_type: str,
    payload: dict[str, Any],
    base_dir: Path | None = None,
) -> dict[str, Any]:
    """Records an operational learning event into LEARNING.md:

    Supported events:
    - lesson_opened: course_slug, lesson_slug, ui
    - run_result: course_slug, lesson_slug, success (bool), is_submit (bool), language
    - reset: course_slug, lesson_slug
    - tutor_level_changed: tutor_style, understanding_level
    - course_authored: course_slug, title, lesson_count
    """
    file_path = get_profile_path(username, base_dir)
    if not file_path.is_file():
        get_or_create_profile(username, base_dir)

    raw_text = file_path.read_text(encoding="utf-8")
    fm_raw, body = parse_frontmatter(raw_text)
    fm = LearnerFrontMatter.model_validate(fm_raw)
    fm.updated_at = datetime.now(timezone.utc).isoformat()

    sections = parse_markdown_sections(body)

    # Dispatch event
    course_slug = payload.get("course_slug", "")
    lesson_slug = payload.get("lesson_slug", "")

    if event_type == "lesson_opened":
        ui = payload.get("ui")
        if ui in ("classic", "light"):
            fm.preferred_ui = ui

        # Update Courses taken section
        taken = sections.get("Courses taken", [])
        entry_prefix = f"- **{course_slug}**"
        new_entry = f"- **{course_slug}** — {lesson_slug} (in progress)."

        # Replace or append
        replaced = False
        for idx, line in enumerate(taken):
            if line.strip().startswith(entry_prefix):
                taken[idx] = new_entry
                replaced = True
                break
        if not replaced and course_slug:
            taken.append(new_entry)
        sections["Courses taken"] = taken

    elif event_type == "run_result":
        success = bool(payload.get("success", False))
        is_submit = bool(payload.get("is_submit", False))
        language = payload.get("language", "python")

        signals = sections.get("Signals", [])

        if not success and is_submit:
            # Struggle signal
            signal_text = f"- Retrying test assertion on {course_slug} ({lesson_slug}, {language})."
            if signal_text not in signals:
                signals.append(signal_text)
        elif success and is_submit:
            signal_text = f"- Completed {course_slug} ({lesson_slug}) with passing {language} tests."
            if signal_text not in signals:
                signals.append(signal_text)

        sections["Signals"] = signals[-10:]  # Keep last 10 signals

    elif event_type == "reset":
        signals = sections.get("Signals", [])
        signal_text = f"- Reset exercise on {course_slug} ({lesson_slug}) to re-attempt from scratch."
        signals.append(signal_text)
        sections["Signals"] = signals[-10:]

    elif event_type == "tutor_level_changed":
        style = payload.get("tutor_style")
        if style in ("solveit", "socratic", "direct", "blooms"):
            fm.tutor_style = style
        level = payload.get("understanding_level", "").lower()
        if level in ("beginner", "intermediate", "advanced"):
            fm.understanding_level = level

    elif event_type == "course_authored":
        title = payload.get("title", course_slug)
        count = payload.get("lesson_count", 1)
        built = sections.get("Courses built", [])
        entry = f"- **{course_slug}** — authored '{title}' ({count} Solveit lessons)."
        if entry not in built:
            built.append(entry)
        sections["Courses built"] = built

    # Reconstruct body
    body_parts = [f"# Learning profile — {fm.username}\n"]
    for sec_name, lines in sections.items():
        if sec_name != "Intro":
            body_parts.append(f"## {sec_name}")
            body_parts.append("\n".join(lines).strip())
            body_parts.append("")

    new_body = "\n\n".join(p for p in body_parts if p).strip()
    new_content = f"{serialize_frontmatter(fm)}\n\n{new_body}\n"
    file_path.write_text(new_content, encoding="utf-8")

    return get_or_create_profile(username, base_dir)[1]
