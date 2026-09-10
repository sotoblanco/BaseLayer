"""Local workspace integration for BaseLayer (`baselayer onboard` output).

A workspace (default ``~/.baselayer``) holds everything the studio needs to
run fully local: ``.env`` (validated LLM keys), ``INSTRUCTOR.md`` (global
teaching defaults), ``MEMORY.md`` (progress digest), ``config.json``,
``data/learners/`` and ``courses/``.

This module is stdlib-only on purpose: it is imported from backend startup
(``main.py``), ``llm.load_settings()``, learner-profile code, and standalone
scripts, under both ``backend.workspace`` and bare ``workspace`` names.

Precedence (highest wins): real environment > repo ``.env`` (sourced by
dev.sh without clobbering presets) > workspace ``.env`` (setdefault only).
Tests stay hermetic via ``BASELAYER_IGNORE_WORKSPACE=1`` (set in
``backend/tests/conftest.py``).
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

DEFAULT_WORKSPACE_NAME = ".baselayer"

# Keys the CLI is allowed to carry from the workspace .env into child env.
WORKSPACE_ENV_KEYS = (
    "LLM_PROVIDER",
    "LLM_MODEL",
    "LLM_API_KEY",
    "LLM_API_BASE",
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "LEARNERS_DATA_DIR",
    "BASELAYER_WORKSPACE",
    "BASELAYER_COURSES_DIR",
)

INSTRUCTOR_KNOWN_KEYS = (
    "tutor_style",
    "tone",
    "pace",
    "explanation_length",
    "exercise_format",
    "hint_preference",
)

MEMORY_SKELETON = """# Memory — BaseLayer local studio

## Active learner
<!-- Set by `baselayer onboard`. -->

## Course progress
<!-- Updated automatically as lessons complete: course, position, XP. -->

## Notes
<!-- Durable facts worth remembering across sessions. -->
"""


def workspace_root(explicit: str | None = None) -> Path | None:
    """Resolve the active workspace root, or None when there is none.

    Explicit path (or BASELAYER_WORKSPACE) wins — deliberate configuration
    beats the kill-switch; otherwise ~/.baselayer when it looks initialized
    (config.json or INSTRUCTOR.md present).
    BASELAYER_IGNORE_WORKSPACE=1 disables ambient discovery (tests, hermetic
    runs) but not explicit configuration.
    """
    if os.environ.get("BASELAYER_IGNORE_WORKSPACE", "").lower() in ("1", "true", "yes"):
        if not explicit and not os.environ.get("BASELAYER_WORKSPACE"):
            return None
    candidate = explicit or os.environ.get("BASELAYER_WORKSPACE")
    if candidate:
        return Path(candidate).expanduser()
    default = Path.home() / DEFAULT_WORKSPACE_NAME
    if (default / "config.json").is_file() or (default / "INSTRUCTOR.md").is_file():
        return default
    return None


def parse_dotenv_file(path: Path) -> dict[str, str]:
    """Parse KEY=VALUE lines (strips `export`, quotes, comments)."""
    values: dict[str, str] = {}
    try:
        content = path.read_text(encoding="utf-8")
    except OSError:
        return values
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        key, sep, value = line.partition("=")
        if not sep:
            continue
        key = key.strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        # Strip trailing inline comments on unquoted values.
        if " #" in value:
            value = value.split(" #", 1)[0].strip()
        values[key] = value
    return values


def apply_workspace_env(explicit: str | None = None) -> Path | None:
    """Load workspace .env with setdefault semantics (never overrides).

    Also defaults LEARNERS_DATA_DIR into the workspace when unset. Course
    catalog union is resolved live via workspace_root() (see
    file_courses._course_roots), not via env. Returns the root, or None when
    no workspace.
    """
    root = workspace_root(explicit)
    if root is None:
        return None
    for key, value in parse_dotenv_file(root / ".env").items():
        if value:
            os.environ.setdefault(key, value)
    os.environ.setdefault("LEARNERS_DATA_DIR", str(root / "data" / "learners"))
    return root


def _parse_instructor_frontmatter(text: str) -> dict[str, Any]:
    """Parse the --- frontmatter of INSTRUCTOR.md (known keys only)."""
    match = re.search(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return {}
    settings: dict[str, Any] = {}
    current_list: str | None = None
    for raw_line in match.group(1).splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("- ") and current_list == "modality_order":
            item = line[2:].strip().strip("'\"")
            if item:
                settings.setdefault("modality_order", []).append(item)
            continue
        current_list = None
        key, sep, value = line.partition(":")
        if not sep:
            continue
        key = key.strip()
        value = value.strip().strip("'\"")
        if key == "modality_order" and not value:
            current_list = "modality_order"
            settings.setdefault("modality_order", [])
        elif key in INSTRUCTOR_KNOWN_KEYS and value:
            settings[key] = value
    return settings


def get_instructor_defaults(explicit: str | None = None) -> dict[str, Any]:
    """Global teaching defaults from <workspace>/INSTRUCTOR.md ({} if none)."""
    root = workspace_root(explicit)
    if root is None:
        return {}
    try:
        return _parse_instructor_frontmatter((root / "INSTRUCTOR.md").read_text(encoding="utf-8"))
    except OSError:
        return {}


def _memory_progress_lines(memory_path: Path) -> tuple[list[str], int, int]:
    """Split MEMORY.md into lines plus the Course-progress section bounds."""
    if not memory_path.is_file():
        return [], -1, -1
    lines = memory_path.read_text(encoding="utf-8").splitlines()
    start = end = -1
    for idx, line in enumerate(lines):
        if line.strip().lower() == "## course progress":
            start = idx
        elif start != -1 and line.startswith("## ") and idx > start:
            end = idx
            break
    if start == -1:
        return lines, -1, -1
    return lines, start, end if end != -1 else len(lines)


def record_memory_progress(
    course_slug: str,
    detail: str,
    explicit: str | None = None,
) -> Path | None:
    """Upsert one `- **slug** — detail` line in MEMORY.md Course progress.

    Creates the file from the skeleton when missing. Returns the path, or
    None when no workspace is active.
    """
    root = workspace_root(explicit)
    if root is None:
        return None
    memory_path = root / "MEMORY.md"
    if not memory_path.is_file():
        memory_path.write_text(MEMORY_SKELETON, encoding="utf-8")
    lines, start, end = _memory_progress_lines(memory_path)
    if start == -1:  # No progress section: append one.
        lines = lines + ["", "## Course progress", f"- **{course_slug}** — {detail}"]
    else:
        section = lines[start:end]
        replaced = False
        for idx, line in enumerate(section):
            if line.strip().startswith(f"- **{course_slug}**"):
                section[idx] = f"- **{course_slug}** — {detail}"
                replaced = True
                break
        if not replaced:
            section.append(f"- **{course_slug}** — {detail}")
        lines = lines[:start] + section + lines[end:]
    memory_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return memory_path
