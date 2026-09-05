from pathlib import Path


def write_submission(
    temp_dir: str, code: str, language: str, test_code: str | None = None
) -> list[str]:
    root = Path(temp_dir)
    tests = (test_code or "").strip()

    if language == "rust":
        source = f"{code}\n\n{tests}" if tests else code
        (root / "main.rs").write_text(source, encoding="utf-8")
        return ["sh", "-c", "rustc main.rs && ./main"]

    (root / "main.py").write_text(code, encoding="utf-8")
    if tests:
        (root / "test.py").write_text(test_code or "", encoding="utf-8")
        return ["python", "-B", "test.py"]
    return ["python", "-B", "main.py"]
