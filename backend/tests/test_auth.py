"""Tests for the local-first learner identity and authentication system.

Covers:
  - Local learner resolution from marker file, environment, and headers
  - Automatic LEARNING.md profile creation
  - Active learner inspection and switching (/auth/active-learner)
  - Local welcome session initialization (/auth/local-welcome)
  - Administrative rights for local developers (/auth/admin-check)
  - Zero-friction unauthenticated access
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from auth import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    get_active_learner_name,
    get_current_user,
    get_password_hash,
    set_active_learner_name,
    verify_password,
)


class TestActiveLearner:
    """Tests for active learner discovery and persistence."""

    def test_default_active_learner(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
        monkeypatch.delenv("ACTIVE_LEARNER", raising=False)
        with patch("learner_profile.get_learners_data_dir", return_value=tmp_path / "learners"):
            name = get_active_learner_name()
            assert name == "local-learner"

    def test_env_var_overrides_active_learner(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("ACTIVE_LEARNER", "custom-engineer")
        assert get_active_learner_name() == "custom-engineer"

    def test_marker_file_persists_active_learner(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ):
        monkeypatch.delenv("ACTIVE_LEARNER", raising=False)
        learners_dir = tmp_path / "learners"
        learners_dir.mkdir(parents=True, exist_ok=True)
        with patch("learner_profile.get_learners_data_dir", return_value=learners_dir):
            set_active_learner_name("ada-lovelace")
            assert get_active_learner_name() == "ada-lovelace"
            marker = tmp_path / "active_learner.txt"
            assert marker.is_file()
            assert marker.read_text(encoding="utf-8").strip() == "ada-lovelace"

    def test_api_get_active_learner(self, client: TestClient, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("ACTIVE_LEARNER", "test-dev")
        res = client.get("/auth/active-learner")
        assert res.status_code == 200
        assert res.json()["username"] == "test-dev"

    def test_api_switch_active_learner(self, client: TestClient, tmp_path: Path):
        learners_dir = tmp_path / "learners"
        learners_dir.mkdir(parents=True, exist_ok=True)
        with patch("learner_profile.get_learners_data_dir", return_value=learners_dir):
            res = client.post("/auth/active-learner", json={"username": "grace-hopper"})
            assert res.status_code == 200
            assert res.json()["username"] == "grace-hopper"
            assert (learners_dir / "grace-hopper" / "LEARNING.md").is_file()

    def test_is_learner_profile_dir_branches(self, tmp_path: Path):
        from auth import _is_learner_profile_dir

        plain = tmp_path / "ada"
        plain.mkdir()
        assert _is_learner_profile_dir(plain) is False  # no LEARNING.md yet
        (plain / "LEARNING.md").write_text("# ada\n", encoding="utf-8")
        assert _is_learner_profile_dir(plain) is True

        verifier = tmp_path / "verifier_123"
        verifier.mkdir()
        (verifier / "LEARNING.md").write_text("# v\n", encoding="utf-8")
        assert _is_learner_profile_dir(verifier) is False

        stray = tmp_path / "notes.txt"
        stray.write_text("x", encoding="utf-8")
        assert _is_learner_profile_dir(stray) is False

    def test_find_first_existing_profile_branches(self, tmp_path: Path):
        from auth import _find_first_existing_profile

        base = tmp_path / "case"
        # Missing learners dir -> None.
        with patch("learner_profile.get_learners_data_dir", return_value=base / "nope"):
            assert _find_first_existing_profile() is None
        # Empty dir -> None.
        learners = base / "learners"
        learners.mkdir(parents=True)
        with patch("learner_profile.get_learners_data_dir", return_value=learners):
            assert _find_first_existing_profile() is None
            # Only verifier scratch dirs -> None.
            verifier = learners / "verifier_9"
            verifier.mkdir()
            (verifier / "LEARNING.md").write_text("# v\n", encoding="utf-8")
            assert _find_first_existing_profile() is None
            # Sorted first valid profile wins.
            for name in ("zara", "ada"):
                user_dir = learners / name
                user_dir.mkdir()
                (user_dir / "LEARNING.md").write_text(f"# {name}\n", encoding="utf-8")
            assert _find_first_existing_profile() == "ada"
            # Backend failure degrades to None instead of raising.
            with patch(
                "learner_profile.get_learners_data_dir",
                side_effect=RuntimeError("disk gone"),
            ):
                assert _find_first_existing_profile() is None


class TestLocalWelcome:
    """Tests for /auth/local-welcome."""

    def test_local_welcome_issues_valid_token(self, client: TestClient, tmp_path: Path):
        learners_dir = tmp_path / "learners"
        learners_dir.mkdir(parents=True, exist_ok=True)
        with patch("learner_profile.get_learners_data_dir", return_value=learners_dir):
            res = client.post("/auth/local-welcome", json={"name": "Ada Lovelace"})
            assert res.status_code == 200
            token = res.json()["access_token"]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            assert payload["sub"] == "ada-lovelace"
            assert payload["role"] == "admin"
            assert (learners_dir / "ada-lovelace" / "LEARNING.md").is_file()


class TestLocalIdentityResolution:
    """Tests for zero-friction user dependency resolution."""

    @pytest.mark.anyio
    async def test_resolves_active_learner_when_no_auth_provided(
        self, monkeypatch: pytest.MonkeyPatch
    ):
        monkeypatch.setenv("ACTIVE_LEARNER", "resident-dev")
        mock_session = pytest.importorskip("unittest.mock").MagicMock()
        mock_session.exec.return_value.first.return_value = None

        user = await get_current_user(
            token=None, learner_header=None, learner_query=None, session=mock_session
        )
        assert user.username == "resident-dev"
        assert user.role == "admin"

    @pytest.mark.anyio
    async def test_header_resolves_learner(self):
        mock_session = pytest.importorskip("unittest.mock").MagicMock()
        mock_session.exec.return_value.first.return_value = None

        user = await get_current_user(
            token=None, learner_header="Margaret Hamilton", learner_query=None, session=mock_session
        )
        assert user.username == "margaret-hamilton"

    @pytest.mark.anyio
    async def test_token_resolves_learner_and_role(self):
        token = create_access_token(data={"sub": "linus", "role": "student"})
        mock_session = pytest.importorskip("unittest.mock").MagicMock()
        mock_session.exec.return_value.first.return_value = None

        user = await get_current_user(
            token=token, learner_header=None, learner_query=None, session=mock_session
        )
        assert user.username == "linus"
        assert user.role == "student"


class TestAdminStatus:
    """Tests for administrative privilege validation."""

    def test_default_local_user_is_admin(self, client: TestClient):
        res = client.get("/auth/admin-check")
        assert res.status_code == 200
        assert res.json()["role"] == "admin"

    def test_student_token_rejected_from_admin(self, client: TestClient):
        student_token = create_access_token(data={"sub": "student-1", "role": "student"})
        res = client.get("/auth/admin-check", headers={"Authorization": f"Bearer {student_token}"})
        assert res.status_code == 403


class TestHelperFunctions:
    """Tests for helper utilities."""

    def test_password_placeholders(self):
        assert verify_password("any_pass", "any_hash") is True
        assert get_password_hash("pass") == "local_no_password"
