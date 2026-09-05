import time
from collections import defaultdict

from fastapi import HTTPException

MAX_CODE_CHARS = 50_000
RUN_RATE_LIMIT = 30
RUN_RATE_WINDOW = 60.0
ALLOWED_LANGUAGES = frozenset({"python", "rust"})

_hits: dict[str, list[float]] = defaultdict(list)


def reset_hits() -> None:
    _hits.clear()


def enforce_run_limits(username: str, code: str, language: str, test_code: str = "") -> None:
    if language not in ALLOWED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported language")
    if len(code) + len(test_code) > MAX_CODE_CHARS:
        raise HTTPException(status_code=413, detail="Code submission too large")

    now = time.monotonic()
    recent = [t for t in _hits[username] if now - t < RUN_RATE_WINDOW]
    if len(recent) >= RUN_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many code executions. Try again shortly.",
        )
    recent.append(now)
    _hits[username] = recent
