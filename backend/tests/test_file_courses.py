"""
Unit tests for file_courses router and helpers.
"""

import json
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from routers.file_courses import (
    get_course_title,
    get_lesson_path,
    get_lesson_title,
    is_lesson_directory,
    parse_course,
    parse_lesson,
    read_file_content,
)


class TestFileCoursesHelpers:
    """Test pure helper functions in file_courses."""

    def test_get_course_title(self):
        assert get_course_title("tinytorch") == "Tinytorch"
        assert get_course_title("llms-from-scratch") == "Llms From Scratch"
        assert get_course_title("deep_learning_101") == "Deep Learning 101"

    def test_get_lesson_title(self):
        assert get_lesson_title("lesson01", 1) == "Lesson 1: Lesson01"
        assert get_lesson_title("intro-to-tensors", 2) == "Lesson 2: Intro To Tensors"

    def test_read_file_content(self, tmp_path: Path):
        file = tmp_path / "hello.txt"
        file.write_text("Hello World", encoding="utf-8")
        assert read_file_content(file) == "Hello World"
        assert read_file_content(tmp_path / "does_not_exist.txt") == ""

    def test_is_lesson_directory(self, tmp_path: Path):
        assert not is_lesson_directory(tmp_path)

        # Only README.md is not enough
        (tmp_path / "README.md").write_text("# Lesson")
        assert not is_lesson_directory(tmp_path)

        # README + main.py is a lesson
        (tmp_path / "main.py").write_text("print(1)")
        assert is_lesson_directory(tmp_path)

    def test_is_lesson_directory_with_rust_or_metadata(self, tmp_path: Path):
        rust_dir = tmp_path / "rust_lesson"
        rust_dir.mkdir()
        (rust_dir / "README.md").write_text("# Rust")
        (rust_dir / "main.rs").write_text("fn main() {}")
        assert is_lesson_directory(rust_dir)

        meta_dir = tmp_path / "meta_lesson"
        meta_dir.mkdir()
        (meta_dir / "README.md").write_text("# Meta")
        (meta_dir / "metadata.json").write_text('{"exercise_type": "spreadsheet"}')
        assert is_lesson_directory(meta_dir)


class TestParseLesson:
    """Test parse_lesson function with various directory structures."""

    def test_parse_nonexistent_directory(self, tmp_path: Path):
        assert parse_lesson(tmp_path, "does_not_exist", 1) is None

    def test_parse_directory_missing_readme(self, tmp_path: Path):
        lesson_dir = tmp_path / "lesson01"
        lesson_dir.mkdir()
        (lesson_dir / "main.py").write_text("pass")
        assert parse_lesson(tmp_path, "lesson01", 1) is None

    def test_parse_valid_python_lesson(self, tmp_path: Path):
        lesson_dir = tmp_path / "lesson01"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Lesson 1 Instructions")
        (lesson_dir / "main.py").write_text("def solve(): pass")
        (lesson_dir / "test.py").write_text("def test_solve(): pass")
        (lesson_dir / "solution.py").write_text("def solve(): return 42")

        lesson = parse_lesson(tmp_path, "lesson01", 1, chapter_slug="chapter1")
        assert lesson is not None
        assert lesson.slug == "chapter1--lesson01"
        assert lesson.title == "Lesson 1: Lesson01"
        assert lesson.description == "# Lesson 1 Instructions"
        assert lesson.initial_code == "def solve(): pass"
        assert lesson.test_code == "def test_solve(): pass"
        assert lesson.solution_code == "def solve(): return 42"
        assert lesson.language == "python"
        assert lesson.chapter == "chapter1"
        assert lesson.exercise_type == "code"

    def test_parse_lesson_with_metadata_json(self, tmp_path: Path):
        lesson_dir = tmp_path / "lesson_sheet"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Sheet Lesson")
        metadata = {
            "exercise_type": "spreadsheet",
            "google_sheet_id": "sheet_12345",
            "copy_on_open": True,
            "stroke_color": "#00ff00",
            "stroke_width": 6,
        }
        (lesson_dir / "metadata.json").write_text(json.dumps(metadata))

        lesson = parse_lesson(tmp_path, "lesson_sheet", 1)
        assert lesson is not None
        assert lesson.exercise_type == "spreadsheet"
        assert lesson.google_sheet_id == "sheet_12345"
        assert lesson.copy_on_open is True
        assert lesson.stroke_color == "#00ff00"
        assert lesson.stroke_width == 6

    def test_parse_lesson_with_invalid_metadata_json(self, tmp_path: Path):
        lesson_dir = tmp_path / "lesson_broken_meta"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Broken Meta")
        (lesson_dir / "metadata.json").write_text("NOT_JSON")

        lesson = parse_lesson(tmp_path, "lesson_broken_meta", 1)
        assert lesson is not None
        assert lesson.exercise_type == "code"
        assert lesson.google_sheet_id is None

    def test_parse_drawing_lesson_with_question_image(self, tmp_path: Path):
        lesson_dir = tmp_path / "lesson_draw"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Draw")
        (lesson_dir / "metadata.json").write_text('{"exercise_type": "drawing"}')
        (lesson_dir / "question.png").write_bytes(b"fake_png_data")

        lesson = parse_lesson(tmp_path, "lesson_draw", 1)
        assert lesson is not None
        assert lesson.exercise_type == "drawing"
        assert lesson.image_url == "__image__"

    def test_parse_rust_lesson(self, tmp_path: Path):
        lesson_dir = tmp_path / "lesson_rust"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Rust")
        (lesson_dir / "main.rs").write_text("fn main() {}")
        (lesson_dir / "test.rs").write_text("#[test] fn t() {}")
        (lesson_dir / "solution.rs").write_text("fn main() { println!(); }")

        lesson = parse_lesson(tmp_path, "lesson_rust", 1)
        assert lesson is not None
        assert lesson.language == "rust"
        assert lesson.initial_code == "fn main() {}"
        assert lesson.test_code == "#[test] fn t() {}"
        assert lesson.solution_code == "fn main() { println!(); }"


class TestParseCourse:
    """Test parse_course function."""

    def test_parse_nonexistent_course(self):
        assert parse_course("nonexistent-course-slug-xyz") is None

    def test_parse_course_with_custom_dir(self, tmp_path: Path, monkeypatch):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "mock_course"
        course_dir.mkdir()
        (course_dir / "README.md").write_text("Course description here")

        ch1 = course_dir / "chapter1"
        ch1.mkdir()
        l1 = ch1 / "lesson01"
        l1.mkdir()
        (l1 / "README.md").write_text("# Ch1 L1")
        (l1 / "main.py").write_text("x = 1")

        course = parse_course("mock_course")
        assert course is not None
        assert course.slug == "mock_course"
        assert course.title == "Mock Course"
        assert course.description == "Course description here"
        assert len(course.lessons) == 1
        assert course.lessons[0].slug == "chapter1--lesson01"

    def test_parse_flat_course_without_chapters(self, tmp_path: Path, monkeypatch):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "flat_course"
        course_dir.mkdir()

        l1 = course_dir / "lesson01"
        l1.mkdir()
        (l1 / "README.md").write_text("# Flat L1")
        (l1 / "main.py").write_text("x = 1")

        course = parse_course("flat_course")
        assert course is not None
        assert len(course.lessons) == 1
        assert course.lessons[0].chapter is None


class TestFileCoursesEndpoints:
    """Integration tests for file_courses API endpoints."""

    def test_list_file_courses(self, client: TestClient):
        response = client.get("/file-courses/")
        assert response.status_code == 200
        courses = response.json()
        assert isinstance(courses, list)
        if courses:
            assert "slug" in courses[0]
            assert "title" in courses[0]
            assert "lesson_count" in courses[0]

    def test_get_existing_file_course(self, client: TestClient, auth_headers):
        # List courses to find an existing one
        list_res = client.get("/file-courses/")
        courses = list_res.json()
        if courses:
            slug = courses[0]["slug"]
            res = client.get(f"/file-courses/{slug}", headers=auth_headers)
            assert res.status_code == 200
            data = res.json()
            assert data["slug"] == slug
            assert "lessons" in data

    def test_get_nonexistent_file_course(self, client: TestClient, auth_headers):
        res = client.get("/file-courses/nonexistent-xyz-course", headers=auth_headers)
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()

    def test_get_existing_file_lesson(self, client: TestClient, auth_headers):
        list_res = client.get("/file-courses/")
        courses = list_res.json()
        if courses:
            slug = courses[0]["slug"]
            course_res = client.get(f"/file-courses/{slug}", headers=auth_headers)
            course_data = course_res.json()
            if course_data["lessons"]:
                lesson_slug = course_data["lessons"][0]["slug"]
                lesson_res = client.get(f"/file-courses/{slug}/{lesson_slug}", headers=auth_headers)
                assert lesson_res.status_code == 200
                assert lesson_res.json()["slug"] == lesson_slug

    def test_get_nonexistent_file_lesson(self, client: TestClient, auth_headers):
        list_res = client.get("/file-courses/")
        courses = list_res.json()
        if courses:
            slug = courses[0]["slug"]
            res = client.get(f"/file-courses/{slug}/nonexistent-lesson", headers=auth_headers)
            assert res.status_code == 404
            assert "not found" in res.json()["detail"].lower()

    def test_get_lesson_image_found_and_not_found(
        self, client: TestClient, tmp_path: Path, monkeypatch
    ):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "c_img"
        course_dir.mkdir()
        lesson_dir = course_dir / "l_img"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Img")
        (lesson_dir / "question.png").write_bytes(b"fake_image_bytes")

        # Found
        res = client.get("/file-courses/c_img/l_img/image")
        assert res.status_code == 200
        assert res.content == b"fake_image_bytes"

        # Missing image in existing lesson
        no_img_dir = course_dir / "l_no_img"
        no_img_dir.mkdir()
        (no_img_dir / "README.md").write_text("# No Img")
        res2 = client.get("/file-courses/c_img/l_no_img/image")
        assert res2.status_code == 404

        # Nonexistent lesson
        res3 = client.get("/file-courses/c_img/ghost/image")
        assert res3.status_code == 404

    def test_get_lesson_solution_found_and_not_found(
        self, client: TestClient, tmp_path: Path, monkeypatch
    ):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "c_sol"
        course_dir.mkdir()
        lesson_dir = course_dir / "l_sol"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Sol")
        (lesson_dir / "solution.png").write_bytes(b"fake_sol_bytes")

        # Found
        res = client.get("/file-courses/c_sol/l_sol/solution")
        assert res.status_code == 200
        assert res.content == b"fake_sol_bytes"

        # Missing solution image
        no_sol_dir = course_dir / "l_no_sol"
        no_sol_dir.mkdir()
        (no_sol_dir / "README.md").write_text("# No Sol")
        res2 = client.get("/file-courses/c_sol/l_no_sol/solution")
        assert res2.status_code == 404

        # Nonexistent lesson
        res3 = client.get("/file-courses/c_sol/ghost/solution")
        assert res3.status_code == 404

    def test_get_lesson_path_fallback(self, tmp_path: Path, monkeypatch):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "c1"
        course_dir.mkdir()
        nested = course_dir / "sub" / "my_lesson"
        nested.mkdir(parents=True)

        found = get_lesson_path("c1", "my_lesson")
        assert found == nested
        assert get_lesson_path("c1", "ghost_lesson") is None

    @patch("routers.file_courses.ai_service.evaluate_drawing")
    def test_submit_drawing_success(
        self, mock_eval, client: TestClient, auth_headers, tmp_path: Path, monkeypatch
    ):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "draw_course"
        course_dir.mkdir()
        lesson_dir = course_dir / "lesson1"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Draw circle")
        (lesson_dir / "question.png").write_bytes(b"question_png")
        (lesson_dir / "solution.png").write_bytes(b"solution_png")

        mock_eval.return_value = {"passed": True, "message": "Great drawing!"}

        res = client.post(
            "/file-courses/draw_course/lesson1/submit-drawing",
            json={"image_data": "data:image/png;base64,aGVsbG8="},
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["passed"] is True
        assert data["message"] == "Great drawing!"

    def test_submit_drawing_nonexistent_lesson(self, client: TestClient, auth_headers):
        res = client.post(
            "/file-courses/ghost_course/ghost_lesson/submit-drawing",
            json={"image_data": "base64data"},
            headers=auth_headers,
        )
        assert res.status_code == 404

    def test_submit_drawing_missing_question_diagram(
        self, client: TestClient, auth_headers, tmp_path: Path, monkeypatch
    ):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "draw_course"
        course_dir.mkdir()
        lesson_dir = course_dir / "lesson1"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Draw")

        res = client.post(
            "/file-courses/draw_course/lesson1/submit-drawing",
            json={"image_data": "base64data"},
            headers=auth_headers,
        )
        assert res.status_code == 500
        assert "diagram missing" in res.json()["detail"].lower()

    @patch("routers.file_courses.ai_service.evaluate_drawing")
    def test_submit_drawing_ai_error(
        self, mock_eval, client: TestClient, auth_headers, tmp_path: Path, monkeypatch
    ):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "draw_course"
        course_dir.mkdir()
        lesson_dir = course_dir / "lesson1"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Draw")
        (lesson_dir / "question.png").write_bytes(b"q")

        mock_eval.return_value = {"error": "AI service unavailable"}

        res = client.post(
            "/file-courses/draw_course/lesson1/submit-drawing",
            json={"image_data": "aGVsbG8="},
            headers=auth_headers,
        )
        assert res.status_code == 500
        assert "AI service unavailable" in res.json()["detail"]

    def test_submit_drawing_invalid_base64(
        self, client: TestClient, auth_headers, tmp_path: Path, monkeypatch
    ):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "draw_course"
        course_dir.mkdir()
        lesson_dir = course_dir / "lesson1"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Draw")
        (lesson_dir / "question.png").write_bytes(b"q")

        res = client.post(
            "/file-courses/draw_course/lesson1/submit-drawing",
            json={"image_data": "invalid!!!base64==="},
            headers=auth_headers,
        )
        assert res.status_code == 400
        assert "Invalid image data" in res.json()["detail"]

    def test_create_sheet_copy_not_spreadsheet(
        self, client: TestClient, auth_headers, tmp_path: Path, monkeypatch
    ):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "c1"
        course_dir.mkdir()
        lesson_dir = course_dir / "l1"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# L1")
        (lesson_dir / "main.py").write_text("x = 1")

        res = client.post(
            "/file-courses/c1/l1/copy-sheet",
            headers=auth_headers,
        )
        assert res.status_code == 400
        assert "not a spreadsheet exercise" in res.json()["detail"]

    def test_create_sheet_copy_course_and_lesson_not_found(self, client: TestClient, auth_headers):
        # Course not found
        res = client.post("/file-courses/ghost_course/l1/copy-sheet", headers=auth_headers)
        assert res.status_code == 404

        # Lesson not found
        list_res = client.get("/file-courses/")
        courses = list_res.json()
        if courses:
            slug = courses[0]["slug"]
            res2 = client.post(
                f"/file-courses/{slug}/ghost_lesson/copy-sheet", headers=auth_headers
            )
            assert res2.status_code == 404

    def test_create_sheet_copy_no_service_account(
        self, client: TestClient, auth_headers, tmp_path: Path, monkeypatch
    ):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "c_sheet"
        course_dir.mkdir()
        lesson_dir = course_dir / "l_sheet"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Sheet")
        metadata = {"exercise_type": "spreadsheet", "google_sheet_id": "12345"}
        (lesson_dir / "metadata.json").write_text(json.dumps(metadata))

        monkeypatch.delenv("GOOGLE_SERVICE_ACCOUNT_FILE", raising=False)
        monkeypatch.delenv("SERVICE_ACCOUNT_FILE", raising=False)

        res = client.post("/file-courses/c_sheet/l_sheet/copy-sheet", headers=auth_headers)
        assert res.status_code == 501
        assert "Service account file not configured" in res.json()["detail"]

    def test_create_sheet_copy_not_installed(
        self, client: TestClient, auth_headers, tmp_path: Path, monkeypatch
    ):
        courses_dir = tmp_path / "courses"
        courses_dir.mkdir()
        monkeypatch.setattr("routers.file_courses.COURSES_DIR", courses_dir)

        course_dir = courses_dir / "c_sheet"
        course_dir.mkdir()
        lesson_dir = course_dir / "l_sheet"
        lesson_dir.mkdir()
        (lesson_dir / "README.md").write_text("# Sheet")
        metadata = {"exercise_type": "spreadsheet", "google_sheet_id": "template_sheet_id"}
        (lesson_dir / "metadata.json").write_text(json.dumps(metadata))

        monkeypatch.setenv("GOOGLE_SERVICE_ACCOUNT_FILE", "/path/to/sa.json")

        res = client.post("/file-courses/c_sheet/l_sheet/copy-sheet", headers=auth_headers)
        # In environment without googleapiclient, it returns 501
        assert res.status_code == 501
        assert "not installed" in res.json()["detail"].lower()
