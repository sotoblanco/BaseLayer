import os
import subprocess
from pathlib import Path


def test_cli_help():
    res = subprocess.run(
        ["node", "cli/bin/baselayer.js", "--help"],
        capture_output=True,
        text=True,
        check=True,
    )
    assert "update [status|repair]" in res.stdout


def test_cli_update_help():
    res = subprocess.run(
        ["node", "cli/bin/baselayer.js", "update", "--help"],
        capture_output=True,
        text=True,
        check=True,
    )
    assert "Usage: baselayer update" in res.stdout
    assert "status" in res.stdout
    assert "repair" in res.stdout


def test_cli_update_status():
    res = subprocess.run(
        ["node", "cli/bin/baselayer.js", "update", "status"],
        capture_output=True,
        text=True,
        check=True,
    )
    assert "baselayer update status" in res.stdout
    assert "CLI version:" in res.stdout
    assert "Current branch:" in res.stdout


def test_cli_update_dry_run():
    res = subprocess.run(
        ["node", "cli/bin/baselayer.js", "update", "--dry-run"],
        capture_output=True,
        text=True,
    )
    assert res.returncode == 0
    assert "baselayer update (dry-run)" in res.stdout


def test_cli_update_course_protection(tmp_path: Path):
    ws = tmp_path / "workspace"
    ws.mkdir()
    fake_repo = tmp_path / "repo"
    course_dir = fake_repo / "courses" / "untracked-course"
    course_dir.mkdir(parents=True)
    (course_dir / "README.md").write_text("# Untracked", encoding="utf-8")

    node_code = (
        "const { protectCourses } = require('./cli/lib/update');\n"
        f"protectCourses(['untracked-course'], '{fake_repo}', '{ws}', false);\n"
    )
    res = subprocess.run(["node", "-e", node_code], capture_output=True, text=True)
    assert res.returncode == 0
    assert (ws / "courses" / "untracked-course" / "README.md").is_file()
