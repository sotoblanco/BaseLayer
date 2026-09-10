"""
Shared test fixtures for the authentication test suite.

Uses an in-memory SQLite database with StaticPool so every connection
shares the same database. This is the standard FastAPI/SQLModel test pattern.
"""

import os

# MUST be set before importing any app module
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["GOOGLE_CLIENT_ID"] = "fake-google-client-id.apps.googleusercontent.com"
os.environ["DATABASE_URL"] = "sqlite://"  # in-memory
# Keep tests hermetic: never pick up a developer's ~/.baselayer workspace.
os.environ["BASELAYER_IGNORE_WORKSPACE"] = "1"

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from database import get_session
from main import app


@pytest.fixture(autouse=True)
def isolate_learners_data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Ensure tests write learner profiles to a temporary directory instead of data/learners/."""
    learners_dir = tmp_path / "learners"
    learners_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("LEARNERS_DATA_DIR", str(learners_dir))


# Single shared in-memory engine
# StaticPool ensures every connection sees the same in-memory database.
test_engine = create_engine(
    "sqlite://",
    echo=False,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


def get_test_session():
    with Session(test_engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture():
    """
    For each test:
      1. Create all tables on the shared in-memory engine.
      2. Override get_session so every request uses this engine.
      3. Tear down tables after the test to start clean.
    """
    SQLModel.metadata.create_all(test_engine)
    app.dependency_overrides[get_session] = get_test_session

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    SQLModel.metadata.drop_all(test_engine)


# ---------- Helper data ----------
VALID_USER = {
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "StrongPass123!",
    "role": "student",
}

ADMIN_USER = {
    "username": "adminuser",
    "email": "admin@example.com",
    "password": "AdminPass456!",
    "role": "admin",
}


@pytest.fixture(name="registered_user")
def registered_user_fixture():
    """Ensure VALID_USER exists in database and return its data."""
    from sqlmodel import select

    from models import User

    with Session(test_engine) as session:
        user = session.exec(select(User).where(User.username == VALID_USER["username"])).first()
        if not user:
            user = User(
                username=VALID_USER["username"],
                email=VALID_USER["email"],
                hashed_password="local_no_password",
                role="student",
            )
            session.add(user)
            session.commit()
    return VALID_USER


@pytest.fixture(name="auth_token")
def auth_token_fixture(registered_user):
    """Return a valid Bearer token for the registered test user."""
    from auth import create_access_token

    return create_access_token(data={"sub": registered_user["username"], "role": "student"})


@pytest.fixture(name="auth_headers")
def auth_headers_fixture(auth_token: str):
    """Return headers dict with Authorization Bearer token and X-Learner-Name."""
    return {
        "Authorization": f"Bearer {auth_token}",
        "X-Learner-Name": "testuser",
    }


@pytest.fixture(name="admin_headers")
def admin_headers_fixture():
    """Ensure ADMIN_USER exists directly and return admin auth headers."""
    from sqlmodel import select

    from auth import create_access_token
    from models import User

    with Session(test_engine) as session:
        user = session.exec(select(User).where(User.username == ADMIN_USER["username"])).first()
        if not user:
            user = User(
                username=ADMIN_USER["username"],
                email=ADMIN_USER["email"],
                hashed_password="local_no_password",
                role="admin",
            )
            session.add(user)
            session.commit()

    token = create_access_token(data={"sub": ADMIN_USER["username"], "role": "admin"})
    return {
        "Authorization": f"Bearer {token}",
        "X-Learner-Name": ADMIN_USER["username"],
    }
