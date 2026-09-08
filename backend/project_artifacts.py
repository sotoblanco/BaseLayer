"""Project artifact storage and workspace management for Build-Project mode (Issue #87).

In Build-Project mode, a course is an ordered chain of steps that accumulate one
working artifact. Step N consumes artifacts produced by prior steps (Step N-1)
and emits its own artifact upon passing tests.

Artifacts are persisted per-user under:
    learners/{username}/projects/{course_slug}/{artifact_filename}
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
from typing import Any

from learner_profile import get_learners_data_dir


def get_user_course_artifacts_dir(
    username: str,
    course_slug: str,
    base_dir: Path | None = None,
) -> Path:
    """Return the directory where a user's project artifacts are stored."""
    clean_user = username.strip() or "anonymous"
    clean_course = course_slug.strip()
    root = base_dir if base_dir is not None else get_learners_data_dir()
    project_dir = root / clean_user / "projects" / clean_course
    project_dir.mkdir(parents=True, exist_ok=True)
    return project_dir


def get_user_artifacts(
    username: str,
    course_slug: str,
    base_dir: Path | None = None,
) -> set[str]:
    """Return the set of artifact filenames already produced by the user."""
    artifact_dir = get_user_course_artifacts_dir(username, course_slug, base_dir=base_dir)
    if not artifact_dir.is_dir():
        return set()
    return {
        entry.name
        for entry in artifact_dir.iterdir()
        if entry.is_file() and not entry.name.startswith(".")
    }


def _resolve_artifact_file(
    filename: str,
    user_dir: Path,
    course_dir: Path | None = None,
) -> Path | None:
    """Resolve an artifact file from user storage or course seed fixtures."""
    user_file = user_dir / filename
    if user_file.is_file():
        return user_file
    if course_dir is not None:
        course_file = course_dir / filename
        if course_file.is_file():
            return course_file
        fixtures_file = course_dir / "fixtures" / filename
        if fixtures_file.is_file():
            return fixtures_file
    return None


def copy_project_artifacts_to_workspace(
    username: str,
    course_slug: str,
    workspace_dir: Path,
    consumes: list[str],
    course_dir: Path | None = None,
    base_dir: Path | None = None,
) -> list[str]:
    """Copy required artifacts for a step into the execution workspace."""
    if not consumes:
        return []

    user_dir = get_user_course_artifacts_dir(username, course_slug, base_dir=base_dir)
    copied: list[str] = []

    for name in consumes:
        filename = os.path.basename(name.strip())
        if not filename:
            continue
        source_path = _resolve_artifact_file(filename, user_dir, course_dir)
        if source_path is not None:
            shutil.copy2(source_path, workspace_dir / filename)
            copied.append(filename)

    return copied


def save_produced_artifact(
    username: str,
    course_slug: str,
    workspace_dir: Path,
    artifact_name: str,
    base_dir: Path | None = None,
) -> bool:
    """Save an artifact generated in workspace_dir to the user's project storage."""
    filename = os.path.basename(artifact_name.strip())
    if not filename:
        return False

    source = workspace_dir / filename
    if not source.is_file():
        return False

    user_dir = get_user_course_artifacts_dir(username, course_slug, base_dir=base_dir)
    target = user_dir / filename
    shutil.copy2(source, target)
    return True


def _read_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def load_course_project_manifest(course_dir: Path) -> dict[str, Any] | None:
    """Return the project manifest dict if course is a project, else None."""
    project_json = course_dir / "project.json"
    if project_json.is_file():
        manifest = _read_json(project_json)
        if manifest.get("is_project", True):
            manifest["is_project"] = True
            return manifest

    metadata_json = course_dir / "metadata.json"
    if metadata_json.is_file():
        meta = _read_json(metadata_json)
        if meta.get("is_project"):
            return meta

    return None


def is_project_course(course_dir: Path) -> bool:
    """Check whether course is marked as a project course."""
    return load_course_project_manifest(course_dir) is not None


def _clean_slug_match(target_slug: str, candidate_slug: str) -> bool:
    if target_slug == candidate_slug:
        return True
    return candidate_slug.endswith(f"--{target_slug}") or target_slug.endswith(f"--{candidate_slug}")


def _clean_str(val: Any) -> str:
    return str(val).strip() if val is not None else ""


def _extract_consumes(raw: Any) -> list[str]:
    raw_list = raw if isinstance(raw, list) else [raw]
    return [s for item in raw_list if (s := _clean_str(item))]


def _extract_produces(raw: Any) -> str | None:
    if raw and str(raw).strip():
        return str(raw).strip()
    return None


def _matches_manifest_step(step: Any, lesson_slug: str) -> bool:
    if not isinstance(step, dict):
        return False
    step_slug = str(step.get("slug") or step.get("lesson_slug") or "")
    return _clean_slug_match(lesson_slug, step_slug)


def _find_step_in_manifest(steps: Any, lesson_slug: str) -> dict[str, Any] | None:
    if not isinstance(steps, list):
        return None
    for step in steps:
        if _matches_manifest_step(step, lesson_slug):
            return step
    return None


def _find_lesson_directory(course_dir: Path, lesson_slug: str) -> Path | None:
    lesson_name = lesson_slug.split("--")[-1]
    direct = course_dir / lesson_name
    if direct.is_dir():
        return direct
    for sub in course_dir.iterdir():
        if sub.is_dir() and (sub / lesson_name).is_dir():
            return sub / lesson_name
    return None


def _load_lesson_file_meta(course_dir: Path, lesson_slug: str) -> dict[str, Any]:
    lesson_dir = _find_lesson_directory(course_dir, lesson_slug)
    if not lesson_dir:
        return {}
    return _read_json(lesson_dir / "metadata.json")


def get_step_artifacts_contract(
    course_dir: Path,
    lesson_slug: str,
) -> tuple[bool, list[str], str | None]:
    """Return (is_project, consumes, produces) for a given lesson in course_dir."""
    manifest = load_course_project_manifest(course_dir)
    if not manifest:
        return False, [], None

    step_info = _find_step_in_manifest(manifest.get("steps"), lesson_slug) or {}
    lesson_meta = _load_lesson_file_meta(course_dir, lesson_slug)

    consumes = _extract_consumes(step_info.get("consumes")) or _extract_consumes(lesson_meta.get("consumes"))
    produces = _extract_produces(step_info.get("produces")) or _extract_produces(lesson_meta.get("produces"))

    return True, consumes, produces


def _is_artifact_present(
    filename: str,
    user_artifacts: set[str],
    course_dir: Path | None = None,
) -> bool:
    if filename in user_artifacts:
        return True
    if course_dir is not None:
        if (course_dir / filename).is_file() or (course_dir / "fixtures" / filename).is_file():
            return True
    return False


def is_step_locked(
    username: str,
    course_slug: str,
    consumes: list[str],
    course_dir: Path | None = None,
    base_dir: Path | None = None,
) -> tuple[bool, list[str]]:
    """Determine if a step is locked based on missing consumed artifacts."""
    if not consumes:
        return False, []

    user_artifacts = get_user_artifacts(username, course_slug, base_dir=base_dir)
    missing = [
        os.path.basename(item.strip())
        for item in consumes
        if not _is_artifact_present(os.path.basename(item.strip()), user_artifacts, course_dir)
    ]
    return len(missing) > 0, missing


def _is_step_entry_locked(
    idx: int,
    step: dict[str, Any],
    username: str,
    course_slug: str,
    course_dir: Path | None,
    base_dir: Path | None,
) -> bool:
    if idx == 0:
        return False
    locked, _ = is_step_locked(
        username=username,
        course_slug=course_slug,
        consumes=step.get("consumes") or [],
        course_dir=course_dir,
        base_dir=base_dir,
    )
    return locked


def check_step_unlock_status(
    username: str,
    course_slug: str,
    steps: list[dict[str, Any]],
    course_dir: Path | None = None,
    base_dir: Path | None = None,
) -> dict[str, bool]:
    """Calculate the lock status of each step in a project course."""
    step_locks: dict[str, bool] = {}
    for idx, step in enumerate(steps):
        slug = step.get("lesson_slug") or step.get("slug") or f"step{idx+1}"
        step_locks[slug] = _is_step_entry_locked(
            idx, step, username, course_slug, course_dir, base_dir
        )
    return step_locks


def _find_courses_dir() -> Path:
    env_path = os.environ.get("COURSES_DIR")
    if env_path:
        return Path(env_path)
    cur = Path(__file__).resolve().parent
    for _ in range(6):
        candidate = cur / "courses"
        if candidate.is_dir():
            return candidate
        cur = cur.parent
    return Path(__file__).resolve().parent.parent / "courses"


def _fail_missing_artifact(result: dict[str, Any], produces: str) -> dict[str, Any]:
    err_msg = f"Verification failed: required artifact '{produces}' was not produced."
    current_err = (result.get("stderr") or "").strip()
    result["stderr"] = f"{current_err}\n{err_msg}".strip() if current_err else err_msg
    result["exit_code"] = 1
    return result


def _handle_produced_artifact(
    temp_path: Path,
    produces: str,
    is_submit: bool,
    result: dict[str, Any],
    username: str,
    course_slug: str,
    base_dir: Path | None,
) -> dict[str, Any]:
    produced_file = temp_path / produces
    if is_submit and not produced_file.is_file():
        return _fail_missing_artifact(result, produces)

    if result.get("exit_code") == 0 and produced_file.is_file():
        save_produced_artifact(
            username=username,
            course_slug=course_slug,
            workspace_dir=temp_path,
            artifact_name=produces,
            base_dir=base_dir,
        )
    return result


def _resolve_project_step(
    course_slug: str,
    lesson_slug: str,
    courses_dir: Path | None,
) -> tuple[Path | None, list[str], str | None]:
    if not course_slug or not lesson_slug:
        return None, [], None
    root_courses = courses_dir or _find_courses_dir()
    course_dir = root_courses / course_slug
    is_proj, consumes, produces = get_step_artifacts_contract(course_dir, lesson_slug)
    if not is_proj:
        return None, [], None
    return course_dir, consumes, produces



from collections.abc import Callable


def build_project_workspace_handlers(
    username: str,
    course_slug: str,
    lesson_slug: str,
    is_submit: bool,
    courses_dir: Path | None = None,
    base_dir: Path | None = None,
) -> tuple[
    bool,
    dict[str, Any] | None,
    Callable[[Path], None] | None,
    Callable[[Path, dict[str, Any]], dict[str, Any] | None] | None,
]:
    """Build setup and inspect handlers for a project step run."""
    course_dir, consumes, produces = _resolve_project_step(course_slug, lesson_slug, courses_dir)
    if course_dir is None:
        return False, None, None, None

    locked, missing = is_step_locked(
        username=username,
        course_slug=course_slug,
        consumes=consumes,
        course_dir=course_dir,
        base_dir=base_dir,
    )
    if locked:
        lock_error = {
            "stdout": "",
            "stderr": f"Step is locked. Complete prior steps to generate: {', '.join(missing)}",
            "exit_code": 1,
        }
        return True, lock_error, None, None

    def setup_workspace(temp_path: Path) -> None:
        copy_project_artifacts_to_workspace(
            username=username,
            course_slug=course_slug,
            workspace_dir=temp_path,
            consumes=consumes,
            course_dir=course_dir,
            base_dir=base_dir,
        )

    def inspect_workspace(temp_path: Path, result: dict[str, Any]) -> dict[str, Any]:
        if not produces:
            return result
        return _handle_produced_artifact(
            temp_path=temp_path,
            produces=produces,
            is_submit=is_submit,
            result=result,
            username=username,
            course_slug=course_slug,
            base_dir=base_dir,
        )

    return True, None, setup_workspace, inspect_workspace





