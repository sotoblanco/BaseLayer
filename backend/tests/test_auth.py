"""
Tests for the authentication system.

Covers:
  - Signup (success, duplicate username, duplicate email)
  - Login with username or email
  - Login with wrong credentials
  - JWT token validation on protected endpoints
  - Admin-only access control
  - Google OAuth flow (mocked)
  - Guest access (unauthenticated) behavior
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from tests.conftest import VALID_USER

# ==============================================================
#  SIGNUP
# ==============================================================


class TestSignup:
    """User registration tests."""

    def test_signup_success(self, client: TestClient):
        """A new user can register and gets back their data."""
        response = client.post("/auth/signup", json=VALID_USER)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == VALID_USER["username"]
        assert data["email"] == VALID_USER["email"]
        assert data["role"] == "student"
        assert "id" in data
        # Password hash must NOT leak
        assert "hashed_password" not in data
        assert "password" not in data

    def test_signup_duplicate_username(self, client: TestClient):
        """Registering with an existing username is rejected."""
        client.post("/auth/signup", json=VALID_USER)
        duplicate = {**VALID_USER, "email": "other@example.com"}
        response = client.post("/auth/signup", json=duplicate)
        assert response.status_code == 400
        assert "Username already registered" in response.json()["detail"]

    def test_signup_duplicate_email(self, client: TestClient):
        """Registering with an existing email is rejected."""
        client.post("/auth/signup", json=VALID_USER)
        duplicate = {**VALID_USER, "username": "otheruser"}
        response = client.post("/auth/signup", json=duplicate)
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_signup_missing_fields(self, client: TestClient):
        """Partial data is rejected by validation."""
        response = client.post("/auth/signup", json={"username": "x"})
        assert response.status_code == 422  # Pydantic validation error


# ==============================================================
#  LOGIN (Email / Password)
# ==============================================================


class TestLogin:
    """Email-and-password login tests."""

    def test_login_with_username(self, client: TestClient, registered_user):
        """Login using the username field."""
        response = client.post(
            "/auth/login",
            data={
                "username": registered_user["username"],
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_login_with_email(self, client: TestClient, registered_user):
        """Login using the email as 'username' (dual-login support)."""
        response = client.post(
            "/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert "access_token" in body

    def test_login_wrong_password(self, client: TestClient, registered_user):
        """Wrong password returns 401."""
        response = client.post(
            "/auth/login",
            data={
                "username": registered_user["username"],
                "password": "WrongPassword!",
            },
        )
        assert response.status_code == 401
        assert "Incorrect" in response.json()["detail"]

    def test_login_nonexistent_user(self, client: TestClient):
        """Logging in as a user that does not exist returns 401."""
        response = client.post(
            "/auth/login",
            data={"username": "ghost", "password": "whatever"},
        )
        assert response.status_code == 401


# ==============================================================
#  JWT TOKEN VALIDATION
# ==============================================================


class TestTokenValidation:
    """Verify JWT-based authentication works end-to-end."""

    def test_valid_token_accepted(self, client: TestClient, auth_headers):
        """A valid token grants access to a protected endpoint."""
        # /auth/me is not implemented, so we use the admin endpoint
        # which checks get_current_user first. We expect 403 (not admin)
        # rather than 401 (unauthenticated).
        response = client.get("/courses/", headers=auth_headers)
        # Courses list should succeed for any authenticated user
        assert response.status_code == 200

    def test_invalid_token_rejected(self, client: TestClient):
        """A garbage token returns 401."""
        response = client.get(
            "/file-courses/nonexistent",
            headers={"Authorization": "Bearer this-is-not-a-real-token"},
        )
        assert response.status_code == 401

    def test_missing_token_rejected(self, client: TestClient):
        """No Authorization header returns 401 on protected endpoints."""
        # Hit a protected file-course detail endpoint
        response = client.get("/file-courses/nonexistent")
        assert response.status_code == 401

    def test_expired_token_rejected(self, client: TestClient, registered_user):
        """A token with an expiration in the past is rejected."""
        from datetime import timedelta

        from auth import create_access_token

        expired_token = create_access_token(
            data={"sub": registered_user["username"], "role": "student"},
            expires_delta=timedelta(seconds=-10),  # already expired
        )
        response = client.get(
            "/file-courses/nonexistent",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401


# ==============================================================
#  ADMIN ACCESS CONTROL
# ==============================================================


class TestAdminAccess:
    """Verify admin-only routes are properly guarded."""

    def test_admin_can_access_admin_routes(self, client: TestClient, admin_headers):
        """Admin user can hit admin-protected endpoints."""
        # Admin dashboard route -- create a course
        response = client.post(
            "/courses/",
            json={
                "title": "Test Course",
                "description": "desc",
                "slug": "test-course",
                "is_published": False,
            },
            headers=admin_headers,
        )
        assert response.status_code == 200

    def test_student_cannot_access_admin_routes(self, client: TestClient, auth_headers):
        """A student token is rejected from admin-protected endpoints."""
        response = client.post(
            "/courses/",
            json={
                "title": "Hack",
                "description": "desc",
                "slug": "hack",
                "is_published": False,
            },
            headers=auth_headers,
        )
        assert response.status_code == 403


# ==============================================================
#  GOOGLE OAUTH (mocked)
# ==============================================================


class TestGoogleLogin:
    """Google OAuth endpoint tests with mocked token verification."""

    MOCK_GOOGLE_IDINFO = {
        "email": "googleuser@gmail.com",
        "name": "Google User",
        "sub": "1234567890",
    }

    @patch("auth.id_token.verify_oauth2_token")
    def test_google_login_creates_new_user(self, mock_verify, client: TestClient):
        """First Google login creates a new account and returns a JWT."""
        mock_verify.return_value = self.MOCK_GOOGLE_IDINFO

        response = client.post(
            "/auth/google",
            json={"credential": "fake-google-id-token"},
        )
        assert response.status_code == 200
        body = response.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    @patch("auth.id_token.verify_oauth2_token")
    def test_google_login_links_existing_user(self, mock_verify, client: TestClient):
        """If a user with the same email already exists, Google login links to it."""
        # First, create a user with the same email via signup
        existing = {
            "username": "existinguser",
            "email": "googleuser@gmail.com",
            "password": "SomePass789!",
            "role": "student",
        }
        signup_resp = client.post("/auth/signup", json=existing)
        assert signup_resp.status_code == 200

        # Now log in via Google with the same email
        mock_verify.return_value = self.MOCK_GOOGLE_IDINFO
        response = client.post(
            "/auth/google",
            json={"credential": "fake-google-id-token"},
        )
        assert response.status_code == 200

        # Verify the token belongs to the existing user, not a new one
        from jose import jwt as jose_jwt

        token = response.json()["access_token"]
        payload = jose_jwt.decode(token, "test-secret-key-for-testing-only", algorithms=["HS256"])
        assert payload["sub"] == "existinguser"

    @patch("auth.id_token.verify_oauth2_token")
    def test_google_login_handles_username_collision(self, mock_verify, client: TestClient):
        """If the email prefix is already taken as a username, a suffix is appended."""
        # Create a user with username = the email prefix
        existing = {
            "username": "googleuser",
            "email": "other@example.com",
            "password": "Pass123!",
            "role": "student",
        }
        client.post("/auth/signup", json=existing)

        # Google login with email "googleuser@gmail.com"
        mock_verify.return_value = self.MOCK_GOOGLE_IDINFO
        response = client.post(
            "/auth/google",
            json={"credential": "fake-google-id-token"},
        )
        assert response.status_code == 200

        from jose import jwt as jose_jwt

        token = response.json()["access_token"]
        payload = jose_jwt.decode(token, "test-secret-key-for-testing-only", algorithms=["HS256"])
        # Username should NOT be "googleuser" (taken), should be "googleuser_1"
        assert payload["sub"] == "googleuser_1"

    @patch("auth.id_token.verify_oauth2_token", side_effect=ValueError("Invalid token"))
    def test_google_login_invalid_token(self, mock_verify, client: TestClient):
        """An invalid Google token returns 401."""
        response = client.post(
            "/auth/google",
            json={"credential": "garbage-token"},
        )
        assert response.status_code == 401
        assert "Invalid Google token" in response.json()["detail"]

    def test_google_login_without_client_id(self, client: TestClient):
        """If GOOGLE_CLIENT_ID is not set, return 500."""
        import auth

        original = auth.GOOGLE_CLIENT_ID
        auth.GOOGLE_CLIENT_ID = None
        try:
            response = client.post(
                "/auth/google",
                json={"credential": "some-token"},
            )
            assert response.status_code == 500
            assert "not configured" in response.json()["detail"]
        finally:
            auth.GOOGLE_CLIENT_ID = original


# ==============================================================
#  GUEST MODE (unauthenticated access)
# ==============================================================


class TestGuestAccess:
    """Verify that guests can browse the catalog but not access course details."""

    def test_guest_can_list_courses(self, client: TestClient):
        """The course catalog endpoint is publicly accessible."""
        response = client.get("/file-courses/")
        assert response.status_code == 200
        # Should return a list (empty is fine)
        assert isinstance(response.json(), list)

    def test_guest_cannot_access_course_detail(self, client: TestClient):
        """Course detail requires authentication; guest gets 401."""
        response = client.get("/file-courses/some-course-slug")
        assert response.status_code == 401

    def test_guest_cannot_access_lesson_detail(self, client: TestClient):
        """Lesson detail requires authentication; guest gets 401."""
        response = client.get("/file-courses/some-course/some-lesson")
        assert response.status_code == 401

    def test_authenticated_user_can_access_course_detail(self, client: TestClient, auth_headers):
        """An authenticated user gets past the auth guard (may get 404 for
        a nonexistent course, but NOT 401)."""
        response = client.get("/file-courses/nonexistent", headers=auth_headers)
        # 404 means auth passed, course just does not exist
        assert response.status_code in (200, 404)
        assert response.status_code != 401


# ==============================================================
#  DIRECT HELPER AND EDGE-CASE TESTS (for 100% branch coverage)
# ==============================================================


class TestAuthHelpersDirect:
    """Direct tests for auth.py functions to ensure full mutation & branch coverage."""

    def test_verify_password_bytes_and_string(self):
        from auth import get_password_hash, verify_password

        hashed = get_password_hash("secret")
        assert verify_password("secret", hashed)
        assert verify_password("secret", hashed.encode("utf-8"))
        assert not verify_password("wrong", hashed)

    def test_create_access_token_default_expiry(self):
        from datetime import datetime, timezone

        from jose import jwt

        from auth import ALGORITHM, SECRET_KEY, create_access_token

        token = create_access_token(data={"sub": "user1"})
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert decoded["sub"] == "user1"
        assert "exp" in decoded
        exp_dt = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
        now_dt = datetime.now(timezone.utc)
        diff = (exp_dt - now_dt).total_seconds()
        assert 890 <= diff <= 910

    @pytest.mark.anyio
    async def test_get_current_user_token_without_sub(self):
        from fastapi import HTTPException

        from auth import create_access_token, get_current_user

        token_no_sub = create_access_token(data={"role": "student"})
        mock_session = MagicMock()

        with pytest.raises(HTTPException) as exc:
            await get_current_user(token=token_no_sub, session=mock_session)
        assert exc.value.status_code == 401
        assert exc.value.detail == "Could not validate credentials"
        assert exc.value.headers == {"WWW-Authenticate": "Bearer"}

    @pytest.mark.anyio
    async def test_get_current_user_user_not_found(self):
        from fastapi import HTTPException

        from auth import create_access_token, get_current_user

        token = create_access_token(data={"sub": "missing_user", "role": "student"})
        mock_session = MagicMock()
        mock_exec = MagicMock()
        mock_exec.first.return_value = None
        mock_session.exec.return_value = mock_exec

        with pytest.raises(HTTPException) as exc:
            await get_current_user(token=token, session=mock_session)
        assert exc.value.status_code == 401
        assert exc.value.detail == "Could not validate credentials"
        assert exc.value.headers == {"WWW-Authenticate": "Bearer"}

    @pytest.mark.anyio
    async def test_get_current_admin_direct(self):
        from fastapi import HTTPException

        from auth import get_current_admin
        from models import User

        admin_user = User(username="adm", email="a@e.com", role="admin", hashed_password="h")
        assert await get_current_admin(user=admin_user) == admin_user

        student_user = User(username="stu", email="s@e.com", role="student", hashed_password="h")
        with pytest.raises(HTTPException) as exc:
            await get_current_admin(user=student_user)
        assert exc.value.status_code == 403
        assert exc.value.detail == "You do not have administrative privileges"

    @pytest.mark.anyio
    async def test_get_optional_user_cases(self, client: TestClient):
        from auth import create_access_token, get_optional_user, get_password_hash
        from models import User
        from tests.conftest import get_test_session

        session = next(get_test_session())

        # Create real test user
        test_u = User(
            username="opt_user",
            email="opt@example.com",
            role="student",
            hashed_password=get_password_hash("p"),
        )
        session.add(test_u)
        session.commit()
        session.refresh(test_u)

        # Case 1: No token
        assert await get_optional_user(token="", session=session) is None

        # Case 2: Invalid JWT
        assert await get_optional_user(token="not-valid-jwt", session=session) is None

        # Case 3: JWT without sub
        no_sub_jwt = create_access_token(data={"role": "student"})
        assert await get_optional_user(token=no_sub_jwt, session=session) is None

        # Case 4: Valid JWT, user found
        valid_jwt = create_access_token(data={"sub": "opt_user", "role": "student"})
        res_user = await get_optional_user(token=valid_jwt, session=session)
        assert res_user is not None
        assert res_user.username == "opt_user"

        # Case 5: Valid JWT, user not found in DB
        ghost_jwt = create_access_token(data={"sub": "ghost_opt_user", "role": "student"})
        assert await get_optional_user(token=ghost_jwt, session=session) is None
