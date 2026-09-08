"""Tests for Build-Project mode (Issue #87).

Verifies manifest loading, artifact persistence, lock status calculation,
workspace copying, verification failure when required artifact is missing,
and step unlocking across the full 3-step project lifecycle.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from project_artifacts import (
    check_step_unlock_status,
    copy_project_artifacts_to_workspace,
    get_step_artifacts_contract,
    get_user_artifacts,
    is_project_course,
    load_course_project_manifest,
    save_produced_artifact,
)


@pytest.fixture
def project_course_dir():
    root = Path(__file__).resolve().parent.parent.parent / "courses" / "tabular-project"
    return root


class TestProjectArtifactsModule:
    def test_manifest_detection_and_parsing(self, project_course_dir):
        assert is_project_course(project_course_dir) is True
        manifest = load_course_project_manifest(project_course_dir)
        assert manifest is not None
        assert manifest.get("is_project") is True
        assert len(manifest.get("steps", [])) == 3

    def test_step_artifacts_contract(self, project_course_dir):
        is_p, c1, p1 = get_step_artifacts_contract(project_course_dir, "step01-ingest")
        assert is_p is True
        assert c1 == []
        assert p1 == "dataset.csv"

        is_p, c2, p2 = get_step_artifacts_contract(project_course_dir, "chapter1--step02-scale")
        assert is_p is True
        assert c2 == ["dataset.csv"]
        assert p2 == "scaled_data.py"

        is_p, c3, p3 = get_step_artifacts_contract(project_course_dir, "step03-predict")
        assert is_p is True
        assert "dataset.csv" in c3
        assert "scaled_data.py" in c3
        assert p3 == "predictions.csv"

    def test_user_artifacts_lifecycle(self, tmp_path):
        username = "test_coder"
        course_slug = "tabular-project"

        # Initially empty
        artifacts = get_user_artifacts(username, course_slug, base_dir=tmp_path)
        assert artifacts == set()

        # Step 1 is unlocked initially, subsequent steps locked
        steps = [
            {"slug": "step01", "consumes": []},
            {"slug": "step02", "consumes": ["dataset.csv"]},
            {"slug": "step03", "consumes": ["dataset.csv", "scaled_data.py"]},
        ]
        locks = check_step_unlock_status(username, course_slug, steps, base_dir=tmp_path)
        assert locks["step01"] is False
        assert locks["step02"] is True
        assert locks["step03"] is True

        # Save produced artifact from workspace
        workspace = tmp_path / "workspace"
        workspace.mkdir()
        (workspace / "dataset.csv").write_text("x,y\n1.0,2.0\n", encoding="utf-8")

        saved = save_produced_artifact(
            username, course_slug, workspace, "dataset.csv", base_dir=tmp_path
        )
        assert saved is True

        artifacts = get_user_artifacts(username, course_slug, base_dir=tmp_path)
        assert "dataset.csv" in artifacts

        # Step 2 now unlocks
        locks = check_step_unlock_status(username, course_slug, steps, base_dir=tmp_path)
        assert locks["step01"] is False
        assert locks["step02"] is False
        assert locks["step03"] is True

        # Copy to new workspace for step 2
        ws2 = tmp_path / "ws2"
        ws2.mkdir()
        copied = copy_project_artifacts_to_workspace(
            username, course_slug, ws2, consumes=["dataset.csv"], base_dir=tmp_path
        )
        assert copied == ["dataset.csv"]
        assert (ws2 / "dataset.csv").is_file()
        assert (ws2 / "dataset.csv").read_text(encoding="utf-8") == "x,y\n1.0,2.0\n"

        # Step 2 emits scaled_data.py
        (ws2 / "scaled_data.py").write_text("MEAN_X = 2.5\n", encoding="utf-8")
        saved2 = save_produced_artifact(
            username, course_slug, ws2, "scaled_data.py", base_dir=tmp_path
        )
        assert saved2 is True

        # Step 3 now unlocks
        locks = check_step_unlock_status(username, course_slug, steps, base_dir=tmp_path)
        assert locks["step03"] is False


class TestProjectModeEndpoints:
    def test_get_file_course_includes_project_flag_and_locks(
        self, client: TestClient, auth_headers
    ):
        response = client.get("/file-courses/tabular-project", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["is_project"] is True
        assert len(data["lessons"]) == 3

        # Step 1 unlocked, Steps 2 and 3 locked
        assert data["lessons"][0]["is_locked"] is False
        assert data["lessons"][0]["produces"] == "dataset.csv"
        assert data["lessons"][1]["is_locked"] is True
        assert data["lessons"][1]["consumes"] == ["dataset.csv"]
        assert data["lessons"][2]["is_locked"] is True

    def test_get_project_artifacts_endpoint(self, client: TestClient, auth_headers):
        response = client.get("/file-courses/tabular-project/artifacts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["is_project"] is True
        assert isinstance(data["artifacts"], list)
        assert "chapter1--step01-ingest" in data["step_locks"]
        assert data["step_locks"]["chapter1--step01-ingest"] is False
        assert data["step_locks"]["chapter1--step02-scale"] is True

    def test_run_rejects_locked_step(self, client: TestClient, auth_headers):
        # Trying to run step 2 while step 1 artifact missing
        response = client.post(
            "/run",
            json={
                "code": "print('running step 2')",
                "language": "python",
                "course_slug": "tabular-project",
                "lesson_slug": "chapter1--step02-scale",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        body = response.json()
        assert body["exit_code"] == 1
        assert "Step is locked" in body["stderr"]
        assert "dataset.csv" in body["stderr"]

    def test_submit_fails_when_required_artifact_not_created(
        self, client: TestClient, auth_headers, monkeypatch
    ):
        # In docker mock, return success exit_code 0, but do not write dataset.csv
        def fake_run(cmd, *args, **kwargs):
            return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="done", stderr="")

        monkeypatch.setattr(subprocess, "run", fake_run)

        response = client.post(
            "/run",
            json={
                "code": "def ingest_raw_data(): pass",
                "test_code": "assert True",
                "is_submit": True,
                "course_slug": "tabular-project",
                "lesson_slug": "chapter1--step01-ingest",
                "language": "python",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        body = response.json()
        assert body["exit_code"] == 1
        assert (
            "Verification failed: required artifact 'dataset.csv' was not produced"
            in body["stderr"]
        )

    def test_end_to_end_project_accumulation(
        self, client: TestClient, auth_headers, monkeypatch, tmp_path
    ):
        import sys

        import learner_profile
        import project_artifacts

        monkeypatch.setattr(learner_profile, "get_learners_data_dir", lambda: tmp_path)
        monkeypatch.setattr(project_artifacts, "get_learners_data_dir", lambda: tmp_path)

        real_run = subprocess.run

        def fake_docker_run(cmd, *args, **kwargs):
            temp_dir = None
            for idx, arg in enumerate(cmd):
                if arg == "-v" and idx + 1 < len(cmd):
                    temp_dir = cmd[idx + 1].split(":")[0]
                    break
            if not temp_dir:
                return real_run(cmd, *args, **kwargs)

            sub_cmd = list(cmd[cmd.index("sandbox-runner") + 1 :])
            if sub_cmd and sub_cmd[0] == "python":
                sub_cmd[0] = sys.executable
            return real_run(sub_cmd, cwd=temp_dir, capture_output=True, text=True)

        monkeypatch.setattr(subprocess, "run", fake_docker_run)

        # 1. Submit Step 1 with correct solution
        step1_dir = (
            Path(__file__).resolve().parent.parent.parent
            / "courses"
            / "tabular-project"
            / "chapter1"
            / "step01-ingest"
        )
        step1_code = (step1_dir / "solution.py").read_text()
        step1_test = (step1_dir / "test.py").read_text()

        res1 = client.post(
            "/run",
            json={
                "code": step1_code,
                "test_code": step1_test,
                "is_submit": True,
                "course_slug": "tabular-project",
                "lesson_slug": "chapter1--step01-ingest",
                "language": "python",
            },
            headers=auth_headers,
        )
        assert res1.status_code == 200
        body1 = res1.json()
        assert body1["exit_code"] == 0, f"Step 1 failed: {body1['stderr']}"

        # Check that artifacts endpoint now shows dataset.csv and step 2 unlocked
        art_res = client.get("/file-courses/tabular-project/artifacts", headers=auth_headers)
        assert art_res.status_code == 200
        art_data = art_res.json()
        assert "dataset.csv" in art_data["artifacts"]
        assert art_data["step_locks"]["chapter1--step02-scale"] is False
        assert art_data["step_locks"]["chapter1--step03-predict"] is True

        # 2. Submit Step 2 with solution
        step2_dir = (
            Path(__file__).resolve().parent.parent.parent
            / "courses"
            / "tabular-project"
            / "chapter1"
            / "step02-scale"
        )
        step2_code = (step2_dir / "solution.py").read_text()
        step2_test = (step2_dir / "test.py").read_text()

        res2 = client.post(
            "/run",
            json={
                "code": step2_code,
                "test_code": step2_test,
                "is_submit": True,
                "course_slug": "tabular-project",
                "lesson_slug": "chapter1--step02-scale",
                "language": "python",
            },
            headers=auth_headers,
        )
        assert res2.status_code == 200
        body2 = res2.json()
        assert body2["exit_code"] == 0, f"Step 2 failed: {body2['stderr']}"

        # Check that step 3 is now unlocked
        art_res2 = client.get("/file-courses/tabular-project/artifacts", headers=auth_headers)
        art_data2 = art_res2.json()
        assert "scaled_data.py" in art_data2["artifacts"]
        assert art_data2["step_locks"]["chapter1--step03-predict"] is False

        # 3. Submit Step 3 with solution
        step3_dir = (
            Path(__file__).resolve().parent.parent.parent
            / "courses"
            / "tabular-project"
            / "chapter1"
            / "step03-predict"
        )
        step3_code = (step3_dir / "solution.py").read_text()
        step3_test = (step3_dir / "test.py").read_text()

        res3 = client.post(
            "/run",
            json={
                "code": step3_code,
                "test_code": step3_test,
                "is_submit": True,
                "course_slug": "tabular-project",
                "lesson_slug": "chapter1--step03-predict",
                "language": "python",
            },
            headers=auth_headers,
        )
        assert res3.status_code == 200
        body3 = res3.json()
        assert body3["exit_code"] == 0, f"Step 3 failed: {body3['stderr']}"

        # Final check: all 3 artifacts exist
        art_res3 = client.get("/file-courses/tabular-project/artifacts", headers=auth_headers)
        art_data3 = art_res3.json()
        assert set(art_data3["artifacts"]) == {"dataset.csv", "scaled_data.py", "predictions.csv"}
