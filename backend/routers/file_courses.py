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
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


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
    order: int
    language: str = "python"


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


def parse_lesson(course_path: Path, lesson_slug: str, order: int) -> Optional[FileLesson]:
    """Parse a lesson directory into a FileLesson object"""
    lesson_path = course_path / lesson_slug
    
    if not lesson_path.is_dir():
        return None
    
    # Check for required files
    readme_path = lesson_path / "README.md"
    main_path = lesson_path / "main.py"
    test_path = lesson_path / "test.py"
    
    # At minimum, we need README.md
    if not readme_path.exists():
        return None
    
    # Determine language from file extension
    language = "python"
    if (lesson_path / "main.rs").exists():
        language = "rust"
        main_path = lesson_path / "main.rs"
        test_path = lesson_path / "test.rs"
    
    return FileLesson(
        slug=lesson_slug,
        title=get_lesson_title(lesson_slug, order),
        description=read_file_content(readme_path),
        initial_code=read_file_content(main_path),
        test_code=read_file_content(test_path),
        order=order,
        language=language
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
    
    # Sort lesson directories to maintain order
    lesson_dirs = sorted([d for d in course_path.iterdir() if d.is_dir()])
    
    for lesson_dir in lesson_dirs:
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
