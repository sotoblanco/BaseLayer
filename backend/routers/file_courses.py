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

import os
import json
import base64
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import time
from ai_service import ai_service


router = APIRouter(prefix="/file-courses", tags=["file-courses"])

# Base directory for courses
# In Modal, courses are mounted at /courses
# Locally, they're relative to the backend folder
COURSES_DIR = Path(os.environ.get("COURSES_DIR", Path(__file__).parent.parent.parent / "courses"))



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
    solution_code: str  # solution.py content (hidden from user until requested)
    order: int
    language: str = "python"
    chapter: Optional[str] = None  # Chapter slug (e.g., "chapter1")
    exercise_type: str = "code"  # "code", "spreadsheet", "drawing"
    google_sheet_id: Optional[str] = None  # Google Sheet ID for spreadsheet exercises
    copy_on_open: bool = False  # If true, create a per-user copy when opening
    image_url: Optional[str] = None  # URL for question image (drawing exercises)
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
    lessons: List[FileLesson]


def get_course_title(slug: str) -> str:
    """Convert slug to human-readable title"""
    return slug.replace("-", " ").replace("_", " ").title()


def get_lesson_title(slug: str, order: int) -> str:
    """Convert lesson slug to human-readable title"""
    # Try to extract number and name
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
    return readme_exists and has_main


def parse_lesson(course_path: Path, lesson_dir_name: str, order: int, chapter_slug: Optional[str] = None) -> Optional[FileLesson]:
    """Parse a lesson directory into a FileLesson object"""
    lesson_path = course_path / lesson_dir_name
    
    if not lesson_path.is_dir():
        return None
    
    # Check for required files
    readme_path = lesson_path / "README.md"
    main_path = lesson_path / "main.py"
    test_path = lesson_path / "test.py"
    
    # At minimum, we need README.md
    if not readme_path.exists():
        return None
    
    # Check for metadata.json for exercise configuration
    exercise_type = "code"
    google_sheet_id = None
    copy_on_open = False
    stroke_color = "#e11d48"
    stroke_width = 4
    metadata_path = lesson_path / "metadata.json"
    
    if metadata_path.exists():
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                exercise_type = metadata.get("exercise_type", "code")
                google_sheet_id = metadata.get("google_sheet_id")
                copy_on_open = bool(metadata.get("copy_on_open", False))
                stroke_color = metadata.get("stroke_color", "#e11d48")
                stroke_width = int(metadata.get("stroke_width", 4))
        except (json.JSONDecodeError, IOError):
            # If metadata.json is invalid, fall back to defaults
            pass

    # Resolve image_url for drawing exercises
    image_url = None
    if exercise_type == "drawing" and (lesson_path / "question.png").exists():
        # This will be resolved into a full URL by the frontend using the course/lesson slug
        image_url = "__image__"  # sentinel; replaced with real URL in the endpoint
    
    # Detect language and set file paths
    language = "python"
    main_path = lesson_path / "main.py"
    test_path = lesson_path / "test.py"
    solution_path = lesson_path / "solution.py"

    if (lesson_path / "main.rs").exists():
        language = "rust"
        main_path = lesson_path / "main.rs"
        test_path = lesson_path / "test.rs"
        solution_path = lesson_path / "solution.rs"
    
    final_slug = f"{chapter_slug}--{lesson_dir_name}" if chapter_slug else lesson_dir_name
    
    return FileLesson(
        slug=final_slug,
        title=get_lesson_title(lesson_dir_name, order),
        description=read_file_content(readme_path),
        initial_code=read_file_content(main_path),
        test_code=read_file_content(test_path),
        solution_code=read_file_content(solution_path),
        order=order,
        language=language,
        chapter=chapter_slug,
        exercise_type=exercise_type,
        google_sheet_id=google_sheet_id,
        copy_on_open=copy_on_open,
        image_url=image_url,
        stroke_color=stroke_color,
        stroke_width=stroke_width,
    )


def parse_course(course_slug: str) -> Optional[FileCourse]:
    """Parse a course directory into a FileCourse object"""
    course_path = COURSES_DIR / course_slug
    
    if not course_path.is_dir():
        return None
    
    # Read course-level README if exists
    course_readme = course_path / "README.md"
    description = read_file_content(course_readme) if course_readme.exists() else f"Learn {get_course_title(course_slug)}"
    
    # Find all lesson directories
    lessons = []
    order = 1
    
    # Get all subdirectories sorted by name
    subdirs = sorted([d for d in course_path.iterdir() if d.is_dir() and not d.name.startswith(".")])
    
    # Check if we have chapters (directories that contain lesson directories)
    # A chapter is a directory that contains lesson subdirectories
    has_chapters = any(
        d.is_dir() and 
        any(is_lesson_directory(sub) for sub in d.iterdir() if sub.is_dir())
        for d in subdirs
    )
    
    if has_chapters:
        # Parse chapters and lessons within chapters
        for chapter_dir in subdirs:
            if chapter_dir.is_dir():
                chapter_slug = chapter_dir.name
                # Get lessons within this chapter
                lesson_dirs = sorted([d for d in chapter_dir.iterdir() if d.is_dir() and not d.name.startswith(".")])
                for lesson_dir in lesson_dirs:
                    lesson = parse_lesson(chapter_dir, lesson_dir.name, order, chapter_slug=chapter_slug)
                    if lesson:
                        lessons.append(lesson)
                        order += 1
    else:
        # Parse lessons directly in course directory (backward compatibility)
        for lesson_dir in subdirs:
            lesson = parse_lesson(course_path, lesson_dir.name, order)
            if lesson:
                lessons.append(lesson)
                order += 1
    
    return FileCourse(
        slug=course_slug,
        title=get_course_title(course_slug),
        description=description.split("\n")[0] if description else "",  # First line as summary
        lessons=lessons
    )


@router.get("/", response_model=List[FileCourseSummary])
def list_file_courses():
    """List all available file-based courses"""
    if not COURSES_DIR.exists():
        return []
    
    courses = []
    for course_dir in sorted(COURSES_DIR.iterdir()):
        if course_dir.is_dir() and not course_dir.name.startswith("."):
            course = parse_course(course_dir.name)
            if course and course.lessons:  # Only include courses with at least one lesson
                courses.append(FileCourseSummary(
                    slug=course.slug,
                    title=course.title,
                    description=course.description,
                    lesson_count=len(course.lessons)
                ))
    
    return courses


@router.get("/{course_slug}", response_model=FileCourse)
def get_file_course(course_slug: str):
    """Get a specific file-based course with all its lessons"""
    course = parse_course(course_slug)
    
    if not course:
        raise HTTPException(status_code=404, detail=f"Course '{course_slug}' not found")
    
    return course


@router.get("/{course_slug}/{lesson_slug}", response_model=FileLesson)
def get_file_lesson(course_slug: str, lesson_slug: str):
    """Get a specific lesson from a file-based course"""
    course = parse_course(course_slug)
    
    if not course:
        raise HTTPException(status_code=404, detail=f"Course '{course_slug}' not found")
    
    for lesson in course.lessons:
        if lesson.slug == lesson_slug:
            return lesson
    
    raise HTTPException(status_code=404, detail=f"Lesson '{lesson_slug}' not found in course '{course_slug}'")


def get_lesson_path(course_slug: str, lesson_slug: str) -> Optional[Path]:
    """Resolve the slug to its physical directory path."""
    course_path = COURSES_DIR / course_slug
    if "--" in lesson_slug:
        chapter_dir, lesson_dir = lesson_slug.split("--", 1)
        path = course_path / chapter_dir / lesson_dir
    else:
        path = course_path / lesson_slug
        
    if path.is_dir():
        return path
        
    # Fallback to rglob for backward compatibility
    for entry in course_path.rglob(f"{lesson_slug}"):
        if entry.is_dir():
            return entry
    return None

@router.get("/{course_slug}/{lesson_slug}/image")
def get_lesson_image(course_slug: str, lesson_slug: str):
    """Serve the question.png image for a drawing exercise."""
    lesson_dir = get_lesson_path(course_slug, lesson_slug)
    if not lesson_dir:
        raise HTTPException(status_code=404, detail="Lesson not found")
        
    image_path = lesson_dir / "question.png"

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found for this lesson")

    return FileResponse(str(image_path), media_type="image/png")


@router.get("/{course_slug}/{lesson_slug}/solution")
def get_lesson_solution(course_slug: str, lesson_slug: str):
    """Serve the solution.png image for a drawing exercise."""
    lesson_dir = get_lesson_path(course_slug, lesson_slug)
    if not lesson_dir:
        raise HTTPException(status_code=404, detail="Lesson not found")
        
    image_path = lesson_dir / "solution.png"

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Solution image not found for this lesson")

    return FileResponse(str(image_path), media_type="image/png")


class DrawingSubmission(BaseModel):
    image_data: str  # base64-encoded PNG from the canvas


@router.post("/{course_slug}/{lesson_slug}/submit-drawing")
def submit_drawing(course_slug: str, lesson_slug: str, submission: DrawingSubmission):
    """Evaluate a drawing submission using AI."""
    lesson_dir = get_lesson_path(course_slug, lesson_slug)

    if not lesson_dir:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Read README.md for instructions
    readme_path = lesson_dir / "README.md"
    instructions = ""
    if readme_path.exists():
        instructions = readme_path.read_text()

    # Read question.png for context
    question_path = lesson_dir / "question.png"
    if not question_path.exists():
        raise HTTPException(status_code=500, detail="Lesson diagram missing (question.png)")
    question_img_bytes = question_path.read_bytes()

    # Read optional solution.png for reference
    solution_path = lesson_dir / "solution.png"
    solution_img_bytes = None
    if solution_path.exists():
        solution_img_bytes = solution_path.read_bytes()

    # Decode student sketch
    try:
        # Expected format: data:image/png;base64,...
        data = submission.image_data
        if "," in data:
            data = data.split(",", 1)[1]
        
        sketch_img_bytes = base64.b64decode(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

    # AI Evaluation
    result = ai_service.evaluate_drawing(instructions, question_img_bytes, sketch_img_bytes, solution_img_bytes)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@router.post("/{course_slug}/{lesson_slug}/copy-sheet")
def create_sheet_copy(course_slug: str, lesson_slug: str):
    """Create a per-user copy of a template Google Sheet for a lesson.

    Requires environment variable `GOOGLE_SERVICE_ACCOUNT_FILE` pointing to a service
    account JSON key with Drive permissions. Returns the new sheet id and URL.
    """
    course = parse_course(course_slug)
    if not course:
        raise HTTPException(status_code=404, detail=f"Course '{course_slug}' not found")

    lesson = None
    for l in course.lessons:
        if l.slug == lesson_slug:
            lesson = l
            break

    if not lesson:
        raise HTTPException(status_code=404, detail=f"Lesson '{lesson_slug}' not found in course '{course_slug}'")

    if lesson.exercise_type != 'spreadsheet' or not lesson.google_sheet_id:
        raise HTTPException(status_code=400, detail="Lesson is not a spreadsheet exercise or has no template sheet id")

    sa_file = os.environ.get('GOOGLE_SERVICE_ACCOUNT_FILE') or os.environ.get('SERVICE_ACCOUNT_FILE')
    if not sa_file:
        raise HTTPException(status_code=501, detail="Service account file not configured. Set GOOGLE_SERVICE_ACCOUNT_FILE env var.")

    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build
    except Exception:
        raise HTTPException(status_code=501, detail="googleapiclient not installed on server")

    try:
        creds = Credentials.from_service_account_file(sa_file, scopes=["https://www.googleapis.com/auth/drive"])
        drive = build('drive', 'v3', credentials=creds)
        new_title = f"{course_slug}-{lesson_slug}-copy-{int(time.time())}"
        copied = drive.files().copy(fileId=lesson.google_sheet_id, body={"name": new_title}).execute()
        new_id = copied.get('id')
        return {"google_sheet_id": new_id, "url": f"https://docs.google.com/spreadsheets/d/{new_id}/edit"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create sheet copy: {e}")