"""
Router for file-based courses.

Reads courses from the 'courses/' directory structure:
courses/
└── {course_slug}/
    └── {lesson_slug}/
        ├── main.py      # Initial code template
        ├── test.py      # Test cases
        └── README.md    # Exercise instructions
"""

import base64
import json
import os
import re
import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ai_service import ai_service
from auth import get_current_user, get_current_user_for_media
from models import User

router = APIRouter(prefix="/file-courses", tags=["file-courses"])


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
    return Path(__file__).resolve().parent.parent.parent / "courses"


COURSES_DIR = _find_courses_dir()

_SLUG_REGEX = re.compile(r"^[a-zA-Z0-9_-]+$")


def _validate_slug(slug: str) -> bool:
    """Validate that a slug segment contains only alphanumeric, dash, and underscore."""
    if not slug or not _SLUG_REGEX.fullmatch(slug):
        return False
    if ".." in slug or slug.startswith("."):
        return False
    return True


def _validate_lesson_slug(lesson_slug: str) -> bool:
    """Validate lesson slug, which may be 'lesson' or 'chapter--lesson'."""
    if not lesson_slug:
        return False
    if "--" in lesson_slug:
        parts = lesson_slug.split("--")
        if len(parts) != 2:
            return False
        return _validate_slug(parts[0]) and _validate_slug(parts[1])
    return _validate_slug(lesson_slug)


def _is_safe_subpath(target: Path, parent: Path) -> bool:
    """Ensure target path strictly resides within parent directory (prevents path traversal)."""
    try:
        target_resolved = target.resolve()
        parent_resolved = parent.resolve()
        rel = target_resolved.relative_to(parent_resolved)
        return str(rel) != "." and not str(rel).startswith("..")
    except (ValueError, RuntimeError):
        return False


class FileLessonSummary(BaseModel):
    """Summary of a lesson (for listing)"""

    slug: str
    title: str
    order: int


class FileLesson(BaseModel):
    """Full lesson data"""

    slug: str
    title: str
    description: str  # README content
    initial_code: str  # main.py content
    test_code: str  # test.py content
    solution_code: str = ""  # never included in course payloads; fetch via /solution-code
    has_solution: bool = False
    order: int
    language: str = "python"
    chapter: str | None = None  # Chapter slug (e.g., "chapter1")
    exercise_type: str = "code"  # "code", "spreadsheet", "drawing"
    google_sheet_id: str | None = None  # Google Sheet ID for spreadsheet exercises
    copy_on_open: bool = False  # If true, create a per-user copy when opening
    image_url: str | None = None  # URL for question image (drawing exercises)
    stroke_color: str = "#e11d48"  # Default stroke color for drawing exercises
    stroke_width: int = 4  # Default stroke width for drawing exercises


class FileCourseSummary(BaseModel):
    """Summary of a course (for listing)"""

    slug: str
    title: str
    description: str
    lesson_count: int


class FileCourse(BaseModel):
    """Full course data with lessons"""

    slug: str
    title: str
    description: str
    lessons: list[FileLesson]


def get_course_title(slug: str) -> str:
    """Convert slug to human-readable title"""
    return slug.replace("-", " ").replace("_", " ").title()


def get_lesson_title(slug: str, order: int) -> str:
    """Convert lesson slug to human-readable title"""
    title = slug.replace("-", " ").replace("_", " ").title()
    return f"Lesson {order}: {title}"


def read_file_content(path: Path) -> str:
    """Read file content, return empty string if not exists"""
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def is_lesson_directory(dir_path: Path) -> bool:
    """Check if a directory is a lesson (contains README.md, main.py/main.rs, etc)"""
    readme_exists = (dir_path / "README.md").exists()
    has_main = (dir_path / "main.py").exists() or (dir_path / "main.rs").exists()
    has_metadata = (dir_path / "metadata.json").exists()
    return readme_exists and (has_main or has_metadata)


def _extract_metadata(lesson_path: Path) -> tuple[str, str | None, bool, str, int, str | None]:
    """Extract metadata configuration for lesson."""
    exercise_type = "code"
    google_sheet_id = None
    copy_on_open = False
    stroke_color = "#e11d48"
    stroke_width = 4
    metadata_path = lesson_path / "metadata.json"

    if metadata_path.exists():
        try:
            with open(metadata_path) as f:
                metadata = json.load(f)
                exercise_type = metadata.get("exercise_type", "code")
                google_sheet_id = metadata.get("google_sheet_id")
                copy_on_open = bool(metadata.get("copy_on_open", False))
                stroke_color = metadata.get("stroke_color", "#e11d48")
                stroke_width = int(metadata.get("stroke_width", 4))
        except (OSError, json.JSONDecodeError):
            pass

    image_url = (
        "__image__"
        if exercise_type == "drawing" and (lesson_path / "question.png").exists()
        else None
    )
    return exercise_type, google_sheet_id, copy_on_open, stroke_color, stroke_width, image_url


def _detect_language_and_files(lesson_path: Path) -> tuple[str, Path, Path, Path]:
    """Detect language and return paths to main, test, and solution files."""
    if (lesson_path / "main.rs").exists():
        return "rust", lesson_path / "main.rs", lesson_path / "test.rs", lesson_path / "solution.rs"
    return "python", lesson_path / "main.py", lesson_path / "test.py", lesson_path / "solution.py"


def parse_lesson(
    course_path: Path, lesson_dir_name: str, order: int, chapter_slug: str | None = None
) -> FileLesson | None:
    """Parse a lesson directory into a FileLesson object"""
    lesson_path = course_path / lesson_dir_name
    readme_path = lesson_path / "README.md"

    if not lesson_path.is_dir() or not readme_path.exists():
        return None

    exercise_type, sheet_id, copy_on_open, stroke_color, stroke_width, image_url = (
        _extract_metadata(lesson_path)
    )
    language, main_path, test_path, solution_path = _detect_language_and_files(lesson_path)
    final_slug = f"{chapter_slug}--{lesson_dir_name}" if chapter_slug else lesson_dir_name

    return FileLesson(
        slug=final_slug,
        title=get_lesson_title(lesson_dir_name, order),
        description=read_file_content(readme_path),
        initial_code=read_file_content(main_path),
        test_code=read_file_content(test_path),
        solution_code="",
        has_solution=solution_path.exists(),
        order=order,
        language=language,
        chapter=chapter_slug,
        exercise_type=exercise_type,
        google_sheet_id=sheet_id,
        copy_on_open=copy_on_open,
        image_url=image_url,
        stroke_color=stroke_color,
        stroke_width=stroke_width,
    )


def _is_chapter_dir(d: Path) -> bool:
    """Return True if directory contains at least one lesson subdirectory."""
    if not d.is_dir() or d.name.startswith("."):
        return False
    return any(is_lesson_directory(sub) for sub in d.iterdir() if sub.is_dir())


def _has_chapters(subdirs: list[Path]) -> bool:
    """Check if course directory contains chapter subdirectories."""
    return any(_is_chapter_dir(d) for d in subdirs)


def _get_valid_subdirs(dir_path: Path) -> list[Path]:
    """Return sorted list of non-hidden subdirectories."""
    return sorted([d for d in dir_path.iterdir() if d.is_dir() and not d.name.startswith(".")])


def _parse_lessons_in_chapter(chapter_dir: Path, start_order: int) -> list[FileLesson]:
    """Parse all lessons in a single chapter directory."""
    lessons: list[FileLesson] = []
    order = start_order
    for lesson_dir in _get_valid_subdirs(chapter_dir):
        lesson = parse_lesson(chapter_dir, lesson_dir.name, order, chapter_slug=chapter_dir.name)
        if lesson:
            lessons.append(lesson)
            order += 1
    return lessons


def _collect_chapter_lessons(subdirs: list[Path]) -> list[FileLesson]:
    """Collect all lessons structured within chapter subdirectories."""
    lessons: list[FileLesson] = []
    for chapter_dir in subdirs:
        if chapter_dir.is_dir() and not chapter_dir.name.startswith("."):
            chapter_lessons = _parse_lessons_in_chapter(chapter_dir, len(lessons) + 1)
            lessons.extend(chapter_lessons)
    return lessons


def _collect_flat_lessons(course_path: Path, subdirs: list[Path]) -> list[FileLesson]:
    """Collect lessons located directly under the course directory."""
    lessons: list[FileLesson] = []
    order = 1
    for lesson_dir in subdirs:
        lesson = parse_lesson(course_path, lesson_dir.name, order)
        if lesson:
            lessons.append(lesson)
            order += 1
    return lessons


def _collect_course_lessons(course_path: Path, subdirs: list[Path]) -> list[FileLesson]:
    """Collect lessons based on chapter or flat directory structure."""
    if _has_chapters(subdirs):
        return _collect_chapter_lessons(subdirs)
    return _collect_flat_lessons(course_path, subdirs)


def _get_course_description(course_path: Path, course_slug: str) -> str:
    """Extract first line of course README or fallback description."""
    course_readme = course_path / "README.md"
    if course_readme.exists():
        desc = read_file_content(course_readme)
        if desc:
            return desc.split("\n")[0]
    return f"Learn {get_course_title(course_slug)}"


def parse_course(course_slug: str) -> FileCourse | None:
    """Parse a course directory into a FileCourse object"""
    if not _validate_slug(course_slug):
        return None
    course_path = COURSES_DIR / course_slug
    if not _is_safe_subpath(course_path, COURSES_DIR) or not course_path.is_dir():
        return None

    subdirs = _get_valid_subdirs(course_path)
    lessons = _collect_course_lessons(course_path, subdirs)

    return FileCourse(
        slug=course_slug,
        title=get_course_title(course_slug),
        description=_get_course_description(course_path, course_slug),
        lessons=lessons,
    )


def _course_summary_from_dir(course_dir: Path) -> FileCourseSummary | None:
    """Build FileCourseSummary from a course directory if valid."""
    if not course_dir.is_dir() or course_dir.name.startswith("."):
        return None
    course = parse_course(course_dir.name)
    if not course or not course.lessons:
        return None
    return FileCourseSummary(
        slug=course.slug,
        title=course.title,
        description=course.description,
        lesson_count=len(course.lessons),
    )


@router.get("/", response_model=list[FileCourseSummary])
def list_file_courses():
    """List all available file-based courses"""
    if not COURSES_DIR.exists():
        return []

    summaries = [_course_summary_from_dir(d) for d in sorted(COURSES_DIR.iterdir())]
    return [s for s in summaries if s is not None]


@router.get("/{course_slug}", response_model=FileCourse)
def get_file_course(course_slug: str, user: User = Depends(get_current_user)):
    """Get a specific file-based course with all its lessons"""
    if not _validate_slug(course_slug):
        raise HTTPException(status_code=400, detail="Invalid course slug format")
    course = parse_course(course_slug)
    if not course:
        raise HTTPException(status_code=404, detail=f"Course '{course_slug}' not found")
    return course


@router.get("/{course_slug}/{lesson_slug}", response_model=FileLesson)
def get_file_lesson(course_slug: str, lesson_slug: str, user: User = Depends(get_current_user)):
    """Get a specific lesson from a file-based course"""
    if not _validate_slug(course_slug) or not _validate_lesson_slug(lesson_slug):
        raise HTTPException(status_code=400, detail="Invalid slug format")
    course = parse_course(course_slug)
    if not course:
        raise HTTPException(status_code=404, detail=f"Course '{course_slug}' not found")

    for lesson in course.lessons:
        if lesson.slug == lesson_slug:
            return lesson

    raise HTTPException(
        status_code=404, detail=f"Lesson '{lesson_slug}' not found in course '{course_slug}'"
    )


def get_lesson_path(course_slug: str, lesson_slug: str) -> Path | None:
    """Resolve the slug to its physical directory path safely."""
    if not _validate_slug(course_slug) or not _validate_lesson_slug(lesson_slug):
        return None

    course_path = COURSES_DIR / course_slug
    if not _is_safe_subpath(course_path, COURSES_DIR) or not course_path.is_dir():
        return None

    if "--" in lesson_slug:
        chapter_dir, lesson_dir = lesson_slug.split("--", 1)
        path = course_path / chapter_dir / lesson_dir
    else:
        path = course_path / lesson_slug

    if _is_safe_subpath(path, course_path) and path.is_dir():
        return path

    for entry in course_path.rglob(f"{lesson_slug}"):
        if entry.is_dir() and _is_safe_subpath(entry, course_path):
            return entry
    return None


@router.get("/{course_slug}/{lesson_slug}/image")
def get_lesson_image(
    course_slug: str,
    lesson_slug: str,
    user: User = Depends(get_current_user_for_media),
):
    """Serve the question.png image for a drawing exercise."""
    if not _validate_slug(course_slug) or not _validate_lesson_slug(lesson_slug):
        raise HTTPException(status_code=400, detail="Invalid slug format")
    lesson_dir = get_lesson_path(course_slug, lesson_slug)
    if not lesson_dir:
        raise HTTPException(status_code=404, detail="Lesson not found")

    image_path = lesson_dir / "question.png"
    if not _is_safe_subpath(image_path, COURSES_DIR) or not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found for this lesson")

    return FileResponse(
        str(image_path),
        media_type="image/png",
        headers={"Cache-Control": "private, no-cache"},
    )


class SolutionCodeRead(BaseModel):
    solution_code: str


@router.get("/{course_slug}/{lesson_slug}/solution-code", response_model=SolutionCodeRead)
def get_lesson_solution_code(
    course_slug: str, lesson_slug: str, user: User = Depends(get_current_user)
):
    if not _validate_slug(course_slug) or not _validate_lesson_slug(lesson_slug):
        raise HTTPException(status_code=400, detail="Invalid slug format")
    lesson_dir = get_lesson_path(course_slug, lesson_slug)
    if not lesson_dir:
        raise HTTPException(status_code=404, detail="Lesson not found")

    _language, _main, _test, solution_path = _detect_language_and_files(lesson_dir)
    if not _is_safe_subpath(solution_path, COURSES_DIR):
        raise HTTPException(status_code=403, detail="Access denied")
    content = read_file_content(solution_path)
    if not content:
        raise HTTPException(status_code=404, detail="Solution not found")
    return SolutionCodeRead(solution_code=content)


@router.get("/{course_slug}/{lesson_slug}/solution")
def get_lesson_solution(
    course_slug: str,
    lesson_slug: str,
    user: User = Depends(get_current_user_for_media),
):
    """Serve the solution.png image for a drawing exercise."""
    if not _validate_slug(course_slug) or not _validate_lesson_slug(lesson_slug):
        raise HTTPException(status_code=400, detail="Invalid slug format")
    lesson_dir = get_lesson_path(course_slug, lesson_slug)
    if not lesson_dir:
        raise HTTPException(status_code=404, detail="Lesson not found")

    image_path = lesson_dir / "solution.png"
    if not _is_safe_subpath(image_path, COURSES_DIR) or not image_path.exists():
        raise HTTPException(status_code=404, detail="Solution image not found for this lesson")

    return FileResponse(
        str(image_path),
        media_type="image/png",
        headers={"Cache-Control": "private, no-store"},
    )


class DrawingSubmission(BaseModel):
    image_data: str  # base64-encoded PNG from the canvas


def _decode_sketch_image(raw_image_data: str) -> bytes:
    """Decode base64 canvas image data."""
    data = raw_image_data
    if "," in data:
        data = data.split(",", 1)[1]
    try:
        return base64.b64decode(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}") from e


def _load_drawing_context_files(lesson_dir: Path) -> tuple[str, bytes, bytes | None]:
    """Load instructions, question image, and optional solution image."""
    readme_path = lesson_dir / "README.md"
    instructions = readme_path.read_text(encoding="utf-8") if readme_path.exists() else ""

    question_path = lesson_dir / "question.png"
    if not question_path.exists():
        raise HTTPException(status_code=500, detail="Lesson diagram missing (question.png)")
    question_img_bytes = question_path.read_bytes()

    solution_path = lesson_dir / "solution.png"
    solution_img_bytes = solution_path.read_bytes() if solution_path.exists() else None

    return instructions, question_img_bytes, solution_img_bytes


@router.post("/{course_slug}/{lesson_slug}/submit-drawing")
def submit_drawing(
    course_slug: str,
    lesson_slug: str,
    submission: DrawingSubmission,
    user: User = Depends(get_current_user),
):
    """Evaluate a drawing submission using AI."""
    if not _validate_slug(course_slug) or not _validate_lesson_slug(lesson_slug):
        raise HTTPException(status_code=400, detail="Invalid slug format")
    lesson_dir = get_lesson_path(course_slug, lesson_slug)
    if not lesson_dir:
        raise HTTPException(status_code=404, detail="Lesson not found")

    instructions, question_bytes, solution_bytes = _load_drawing_context_files(lesson_dir)
    sketch_bytes = _decode_sketch_image(submission.image_data)

    result = ai_service.evaluate_drawing(instructions, question_bytes, sketch_bytes, solution_bytes)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


def _validate_spreadsheet_lesson(lesson: FileLesson) -> FileLesson:
    """Validate that a lesson is a spreadsheet exercise with template id."""
    if lesson.exercise_type != "spreadsheet" or not lesson.google_sheet_id:
        raise HTTPException(
            status_code=400,
            detail="Lesson is not a spreadsheet exercise or has no template sheet id",
        )
    return lesson


def _find_lesson_for_copy(course_slug: str, lesson_slug: str) -> FileLesson:
    """Find and validate lesson for spreadsheet copy."""
    if not _validate_slug(course_slug) or not _validate_lesson_slug(lesson_slug):
        raise HTTPException(status_code=400, detail="Invalid slug format")
    course = parse_course(course_slug)
    if not course:
        raise HTTPException(status_code=404, detail=f"Course '{course_slug}' not found")

    for lesson in course.lessons:
        if lesson.slug == lesson_slug:
            return _validate_spreadsheet_lesson(lesson)

    raise HTTPException(
        status_code=404, detail=f"Lesson '{lesson_slug}' not found in course '{course_slug}'"
    )


def _get_service_account_path() -> str:
    """Retrieve service account file path from environment."""
    sa_file = os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE") or os.environ.get(
        "SERVICE_ACCOUNT_FILE"
    )
    if not sa_file:
        raise HTTPException(
            status_code=501,
            detail="Service account file not configured. Set GOOGLE_SERVICE_ACCOUNT_FILE env var.",
        )
    return sa_file


@router.post("/{course_slug}/{lesson_slug}/copy-sheet")
def create_sheet_copy(course_slug: str, lesson_slug: str, user: User = Depends(get_current_user)):
    """Create a per-user copy of a template Google Sheet for a lesson."""
    lesson = _find_lesson_for_copy(course_slug, lesson_slug)
    sa_file = _get_service_account_path()

    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build
    except Exception:
        raise HTTPException(
            status_code=501, detail="googleapiclient not installed on server"
        ) from None

    try:
        creds = Credentials.from_service_account_file(
            sa_file, scopes=["https://www.googleapis.com/auth/drive"]
        )
        drive = build("drive", "v3", credentials=creds)
        new_title = f"{course_slug}-{lesson_slug}-copy-{int(time.time())}"
        copied = (
            drive.files().copy(fileId=lesson.google_sheet_id, body={"name": new_title}).execute()
        )
        new_id = copied.get("id")
        return {
            "google_sheet_id": new_id,
            "url": f"https://docs.google.com/spreadsheets/d/{new_id}/edit",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create sheet copy: {e}") from e
