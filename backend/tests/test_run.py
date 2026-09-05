from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from run_exec import write_submission
from run_limits import (
    MAX_CODE_CHARS,
    enforce_run_limits,
    reset_hits,
)


@pytest.fixture(autouse=True)
def _clear_run_quota():
    reset_hits()
    yield
    reset_hits()


class TestEnforceRunLimits:
    def test_rejects_unsupported_language(self):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            enforce_run_limits("alice", "print(1)", "bash")
        assert exc.value.status_code == 400

    def test_rejects_oversized_code(self):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            enforce_run_limits("alice", "x" * (MAX_CODE_CHARS + 1), "python")
        assert exc.value.status_code == 413

    def test_rate_limits_after_quota(self, monkeypatch):
        from fastapi import HTTPException

        import run_limits

        monkeypatch.setattr(run_limits, "RUN_RATE_LIMIT", 2)
        enforce_run_limits("alice", "print(1)", "python")
        enforce_run_limits("alice", "print(1)", "python")
        with pytest.raises(HTTPException) as exc:
            enforce_run_limits("alice", "print(1)", "python")
        assert exc.value.status_code == 429

    def test_quota_is_per_user(self, monkeypatch):
        import run_limits

        monkeypatch.setattr(run_limits, "RUN_RATE_LIMIT", 1)
        enforce_run_limits("alice", "print(1)", "python")
        enforce_run_limits("bob", "print(1)", "python")


class TestWriteSubmission:
    def test_python_without_tests_runs_main(self, tmp_path: Path):
        cmd = write_submission(str(tmp_path), "class Tensor: pass\n", "python")
        assert cmd == ["python", "-B", "main.py"]
        assert (tmp_path / "main.py").read_text() == "class Tensor: pass\n"
        assert not (tmp_path / "test.py").exists()

    def test_python_with_tests_runs_test_file(self, tmp_path: Path):
        cmd = write_submission(
            str(tmp_path),
            "class Tensor: pass\n",
            "python",
            "from main import Tensor\n\ndef test_ok():\n    assert Tensor\ntest_ok()\n",
        )
        assert cmd == ["python", "-B", "test.py"]
        assert "class Tensor" in (tmp_path / "main.py").read_text()
        assert "from main import Tensor" in (tmp_path / "test.py").read_text()

    def test_rust_concatenates_tests_into_main(self, tmp_path: Path):
        cmd = write_submission(str(tmp_path), "fn main() {}", "rust", "fn extra() {}")
        assert cmd[0] == "sh"
        source = (tmp_path / "main.rs").read_text()
        assert "fn main()" in source
        assert "fn extra()" in source


class TestRunEndpoint:
    def test_run_requires_auth(self, client: TestClient):
        response = client.post("/run", json={"code": "print(1)", "language": "python"})
        assert response.status_code == 401

    def test_run_rejects_large_payload(self, client: TestClient, auth_headers):
        response = client.post(
            "/run",
            json={"code": "x" * (MAX_CODE_CHARS + 1), "language": "python"},
            headers=auth_headers,
        )
        assert response.status_code == 413

    def test_run_rejects_unsupported_language(self, client: TestClient, auth_headers):
        response = client.post(
            "/run",
            json={"code": "echo hi", "language": "bash"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_run_rate_limit(self, client: TestClient, auth_headers, monkeypatch):
        import run_limits

        monkeypatch.setattr(run_limits, "RUN_RATE_LIMIT", 2)
        payload = {"code": "print(1)", "language": "python"}
        assert client.post("/run", json=payload, headers=auth_headers).status_code != 429
        assert client.post("/run", json=payload, headers=auth_headers).status_code != 429
        third = client.post("/run", json=payload, headers=auth_headers)
        assert third.status_code == 429

    def test_authenticated_run_reaches_executor(self, client: TestClient, auth_headers):
        response = client.post(
            "/run",
            json={"code": "print(1)", "language": "python"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        body = response.json()
        assert "stdout" in body
        assert "stderr" in body
        assert "exit_code" in body

    def test_run_accepts_separate_test_code(self, client: TestClient, auth_headers):
        response = client.post(
            "/run",
            json={
                "code": "class Tensor:\n    pass\n",
                "test_code": "from main import Tensor\n",
                "language": "python",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
