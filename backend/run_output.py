"""Sanitize code-run stderr so the Run console never echoes the answer key.

Student-facing runs execute the lesson's hidden ``test.py``. A failing assert
prints the assert source line (with expected literals) into the traceback, but
the Tests editor tab is hidden from students (``testVisibility.ts``). Without
sanitization, a student can intentionally fail a test and read the expected
values from the echoed traceback (issue #106).

Only the student-facing ``POST /run`` boundary sanitizes; author-side lesson
verification (``course_import``) keeps full tracebacks for debugging.
"""

from __future__ import annotations

GENERIC_ASSERTION_MESSAGE = (
    "AssertionError: a test assertion failed. Check your work and try again."
)

_CARET_CHARS = set("^~*|")


def _is_assert_source(line: str) -> bool:
    return line.strip().startswith("assert ")


def _is_caret_line(line: str) -> bool:
    stripped = line.strip()
    return bool(stripped) and set(stripped) <= _CARET_CHARS


def sanitize_run_stderr(stderr: str) -> str:
    """Strip answer-key details from a failing test run's stderr.

    Drops echoed ``assert ...`` source lines and their ``^^^`` caret markers,
    and replaces any ``AssertionError: <detail>`` tail (which often quotes the
    expected value) with a generic message. The ``File "test.py", line N, in
    <test_name>`` headers are kept so the learner still knows *which* check
    failed, and non-assert errors (NameError, TypeError, SyntaxError in the
    learner's own code) pass through untouched.
    """
    if not stderr:
        return stderr
    cleaned: list[str] = []
    for line in stderr.splitlines():
        if _is_assert_source(line):
            continue
        if _is_caret_line(line):
            continue
        if line.strip().startswith("AssertionError"):
            cleaned.append(GENERIC_ASSERTION_MESSAGE)
            continue
        cleaned.append(line)
    result = "\n".join(cleaned)
    if stderr.endswith("\n") and not result.endswith("\n"):
        result += "\n"
    return result
