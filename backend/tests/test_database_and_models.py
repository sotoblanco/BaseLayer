"""
Unit tests for database utilities and models.
"""

from sqlmodel import Session

from database import create_db_and_tables, engine, get_session
from models import (
    Course,
    Exercise,
    ExerciseUpdate,
    GoogleTokenRequest,
    Token,
    TokenData,
)


class TestModels:
    """Test SQLModel schemas and validations."""

    def test_course_and_exercise_models(self):
        course = Course(
            title="PyTorch Basics",
            slug="pytorch-basics",
            description="Deep Learning",
            is_published=True,
        )
        assert course.title == "PyTorch Basics"
        assert course.is_published is True

        ex = Exercise(
            title="Tensors",
            slug="tensors",
            description="# Tensors",
            initial_code="x = 1",
            test_code="assert x == 1",
            course=course,
        )
        assert ex.title == "Tensors"
        assert ex.passing_rule == "tests_pass"
        assert ex.language == "python"

    def test_exercise_update_model(self):
        update = ExerciseUpdate(title="Updated Title", passing_rule="ai_eval")
        assert update.title == "Updated Title"
        assert update.passing_rule == "ai_eval"
        assert update.description is None

    def test_token_and_auth_models(self):
        token = Token(access_token="abc.123", token_type="bearer")
        assert token.access_token == "abc.123"
        assert token.token_type == "bearer"

        token_data = TokenData(username="alex", role="student")
        assert token_data.username == "alex"
        assert token_data.role == "student"

        google_req = GoogleTokenRequest(credential="google_jwt_credential")
        assert google_req.credential == "google_jwt_credential"


class TestDatabase:
    """Test database setup functions."""

    def test_create_db_and_tables(self):
        # Calling create_db_and_tables should not raise
        create_db_and_tables()

    def test_get_session(self):
        gen = get_session()
        session = next(gen)
        assert isinstance(session, Session)
        assert session.bind == engine
        try:
            next(gen)
        except StopIteration:
            pass
