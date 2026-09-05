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

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from auth import get_password_hash
from database import get_session
from main import app
from models import User

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
def registered_user_fixture(client: TestClient):
    """Register VALID_USER and return its data."""
    response = client.post("/auth/signup", json=VALID_USER)
    assert response.status_code == 200, response.text
    return VALID_USER


@pytest.fixture(name="auth_token")
def auth_token_fixture(client: TestClient, registered_user):
    """Log in VALID_USER and return a valid Bearer token string."""
    response = client.post(
        "/auth/login",
        data={"username": registered_user["email"], "password": registered_user["password"]},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture(name="auth_headers")
def auth_headers_fixture(auth_token: str):
    """Return headers dict with Authorization Bearer token."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(name="admin_headers")
def admin_headers_fixture(client: TestClient):
    """Insert ADMIN_USER directly (signup cannot grant admin) and return headers."""
    with Session(test_engine) as session:
        session.add(
            User(
                username=ADMIN_USER["username"],
                email=ADMIN_USER["email"],
                hashed_password=get_password_hash(ADMIN_USER["password"]),
                role="admin",
            )
        )
        session.commit()
    response = client.post(
        "/auth/login",
        data={"username": ADMIN_USER["username"], "password": ADMIN_USER["password"]},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
