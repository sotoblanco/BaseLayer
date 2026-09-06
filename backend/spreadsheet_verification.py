"""
Spreadsheet cell verification for file-based spreadsheet lessons (Issue #75).

Splits the verification flow into:
  * pure, unit-testable grading logic (``parse_success_cells`` / ``grade_sheet``)
  * an optional, service-backed reader for a student's Google Sheet copy
    (``read_user_sheet_values``). The reader never fakes a pass: when the
    service account or the googleapiclient library is not configured it raises
    ``VerificationUnavailableError`` (surfaced as HTTP 501) and when Google
    cannot be reached it raises ``SheetReadError`` (surfaced as HTTP 502).

No real external Google API is ever called from tests or CI: the router tests
patch ``read_user_sheet_values``.
"""

from __future__ import annotations

import os
import re
from typing import Any

from pydantic import BaseModel, Field

_CELL_RE = re.compile(r"^[A-Z]{1,3}[1-9][0-9]*$")
_SHEET_URL_RE = re.compile(r"/spreadsheets/d/([A-Za-z0-9_-]+)")
_RAW_SHEET_ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,}$")


class VerificationUnavailableError(Exception):
    """Raised when sheet verification cannot run (no credentials / library)."""


class SheetReadError(Exception):
    """Raised when the configured reader cannot reach or read the sheet."""


class SpreadsheetTargetCell(BaseModel):
    """Expected value for a single spreadsheet cell (metadata ``success_cells``)."""

    cell: str = Field(..., description="A1-style cell reference, e.g. 'B2'")
    expected: str = Field(..., description="Expected displayed/computed value")


class SpreadsheetCellCheck(BaseModel):
    """Per-cell grading outcome for one target cell."""

    cell: str
    expected: str
    actual: str | None = None
    ok: bool


class SpreadsheetVerificationResult(BaseModel):
    """Structured result returned by the verify-sheet endpoint."""

    passed: bool
    checks: list[SpreadsheetCellCheck]
    message: str
    verification: str = "ok"


def normalize_sheet_value(value: Any) -> str:
    """Normalize a cell value for comparison."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _numeric_equal(left: str, right: str) -> bool:
    try:
        return float(left) == float(right)
    except ValueError:
        return False


def values_match(expected: Any, actual: Any) -> bool:
    """Compare an expected literal with an actual cell value."""
    expected_s = normalize_sheet_value(expected)
    actual_s = normalize_sheet_value(actual)
    if expected_s.lower() == actual_s.lower():
        return True
    return _numeric_equal(expected_s, actual_s)


def normalize_cell_reference(cell: Any) -> str | None:
    """Upper-case and validate an A1 cell reference, or None if invalid."""
    if not isinstance(cell, str):
        return None
    normalized = cell.strip().upper()
    if not _CELL_RE.fullmatch(normalized):
        return None
    return normalized


def parse_success_cells(raw: Any) -> list[SpreadsheetTargetCell]:
    """Parse the metadata ``success_cells`` list into validated target cells."""
    if not isinstance(raw, list):
        return []
    cells: list[SpreadsheetTargetCell] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        cell = normalize_cell_reference(item.get("cell"))
        if not cell:
            continue
        expected = item.get("expected")
        if expected is None:
            continue
        cells.append(SpreadsheetTargetCell(cell=cell, expected=normalize_sheet_value(expected)))
    return cells


def grade_sheet(
    cells: list[SpreadsheetTargetCell],
    actual_values: dict[str, Any],
) -> SpreadsheetVerificationResult:
    """Grade the target cells against the actual values read from a sheet."""
    if not cells:
        return SpreadsheetVerificationResult(
            passed=False,
            checks=[],
            message="No target cells are defined for this lesson to check.",
        )
    checks: list[SpreadsheetCellCheck] = []
    for spec in cells:
        raw = actual_values.get(spec.cell)
        ok = values_match(spec.expected, raw)
        checks.append(
            SpreadsheetCellCheck(
                cell=spec.cell,
                expected=spec.expected,
                actual=raw if raw is None else normalize_sheet_value(raw),
                ok=ok,
            )
        )
    passed = all(check.ok for check in checks)
    failing = len(checks) - sum(1 for check in checks if check.ok)
    if passed:
        message = "All target cells match. Your spreadsheet passed the checks."
    else:
        message = (
            f"{failing} of {len(checks)} target {'cell' if len(checks) == 1 else 'cells'} "
            "did not match. Inspect the highlighted cells and try again."
        )
    return SpreadsheetVerificationResult(passed=passed, checks=checks, message=message)


def extract_sheet_id(raw: Any) -> str | None:
    """Extract a Google Sheet id from a URL or a bare sheet id string."""
    if not isinstance(raw, str):
        return None
    text = raw.strip()
    if not text:
        return None
    url_match = _SHEET_URL_RE.search(text)
    if url_match:
        return url_match.group(1)
    if _RAW_SHEET_ID_RE.fullmatch(text):
        return text
    return None


def _column_index_to_letters(index: int) -> str:
    """Convert a 0-based column index to A1 column letters."""
    letters = ""
    index += 1
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        letters = chr(ord("A") + remainder) + letters
    return letters


def _grid_to_cell_map(response: dict[str, Any]) -> dict[str, Any]:
    """Expand a Sheets API values response into an {A1: value} mapping."""
    values = response.get("values", []) or []
    start_row = int(response.get("startRow", 0))
    start_col = int(response.get("startColumn", 0))
    cell_map: dict[str, Any] = {}
    for row_offset, row in enumerate(values):
        for col_offset, value in enumerate(row):
            col_letters = _column_index_to_letters(start_col + col_offset)
            cell_map[f"{col_letters}{start_row + row_offset + 1}"] = value
    return cell_map


def read_user_sheet_values(sheet_id: str) -> dict[str, Any]:
    """Read the used range of a student sheet copy and return an {A1: value} map.

    Requires a Google service account (``GOOGLE_SERVICE_ACCOUNT_FILE`` or
    ``SERVICE_ACCOUNT_FILE``) that can access the sheet and the optional
    ``googleapiclient`` library. Raises ``VerificationUnavailableError`` when
    either is missing and ``SheetReadError`` when Google rejects the request.
    """
    sa_file = os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE") or os.environ.get(
        "SERVICE_ACCOUNT_FILE"
    )
    if not sa_file:
        raise VerificationUnavailableError(
            "Sheet verification is not configured on this deployment. "
            "Set GOOGLE_SERVICE_ACCOUNT_FILE to enable automated cell checks."
        )

    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build
    except Exception:
        raise VerificationUnavailableError(
            "Sheet verification is not available: googleapiclient is not installed on the server."
        ) from None

    try:
        creds = Credentials.from_service_account_file(
            sa_file,
            scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
        )
        service = build("sheets", "v4", credentials=creds)
        response = (
            service.spreadsheets()
            .values()
            .get(
                spreadsheetId=sheet_id,
                range="A1:ZZ500",
                valueRenderOption="UNFORMATTED_VALUE",
                dateTimeRenderOption="FORMATTED_STRING",
            )
            .execute()
        )
    except VerificationUnavailableError:
        raise
    except Exception as exc:
        raise SheetReadError(
            "Could not read your spreadsheet. Make sure the link is a copy created "
            "from the lesson template and that it is shared with the app."
        ) from exc
    return _grid_to_cell_map(response)
