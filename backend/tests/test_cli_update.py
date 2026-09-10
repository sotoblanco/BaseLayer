import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
CLI_BIN = str(REPO_ROOT / "cli" / "bin" / "baselayer.js")
UPDATE_LIB = (REPO_ROOT / "cli" / "lib" / "update").as_posix()


def test_cli_help():
    res = subprocess.run(
        ["node", CLI_BIN, "--help"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "update [status|repair]" in res.stdout


def test_cli_update_help():
    res = subprocess.run(
        ["node", CLI_BIN, "update", "--help"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "Usage: baselayer update" in res.stdout
    assert "status" in res.stdout
    assert "repair" in res.stdout


def test_cli_update_status():
    res = subprocess.run(
        ["node", CLI_BIN, "update", "status"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "baselayer update status" in res.stdout
    assert "CLI version:" in res.stdout
    assert "Current branch:" in res.stdout


def test_cli_update_dry_run():
    res = subprocess.run(
        ["node", CLI_BIN, "update", "--dry-run"],
        cwd=REPO_ROOT,
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
        f"const {{ protectCourses }} = require('{UPDATE_LIB}');\n"
        f"protectCourses(['untracked-course'], '{fake_repo.as_posix()}', '{ws.as_posix()}', false);\n"
    )
    res = subprocess.run(["node", "-e", node_code], cwd=REPO_ROOT, capture_output=True, text=True)
    assert res.returncode == 0
    assert (ws / "courses" / "untracked-course" / "README.md").is_file()
