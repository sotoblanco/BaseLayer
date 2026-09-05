import time
from collections import defaultdict

from fastapi import HTTPException

MAX_CODE_CHARS = 50_000
RUN_RATE_LIMIT = 30
RUN_RATE_WINDOW = 60.0
ALLOWED_LANGUAGES = frozenset({"python", "rust"})

AI_RATE_LIMIT = 20
AI_RATE_WINDOW = 60.0
MAX_AI_MESSAGE_CHARS = 4_000
MAX_AI_CONTEXT_CHARS = 20_000

_hits: dict[str, list[float]] = defaultdict(list)
_ai_hits: dict[str, list[float]] = defaultdict(list)


def reset_hits() -> None:
    _hits.clear()
    _ai_hits.clear()


def _enforce_rate(
    store: dict[str, list[float]], key: str, limit: int, window: float, detail: str
) -> None:
    now = time.monotonic()
    recent = [t for t in store[key] if now - t < window]
    if len(recent) >= limit:
        raise HTTPException(status_code=429, detail=detail)
    recent.append(now)
    store[key] = recent


def enforce_run_limits(username: str, code: str, language: str, test_code: str = "") -> None:
    if language not in ALLOWED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported language")
    if len(code) + len(test_code) > MAX_CODE_CHARS:
        raise HTTPException(status_code=413, detail="Code submission too large")
    _enforce_rate(
        _hits,
        username,
        RUN_RATE_LIMIT,
        RUN_RATE_WINDOW,
        "Too many code executions. Try again shortly.",
    )


def enforce_ai_limits(username: str, message: str, context: str = "") -> None:
    if len(message) > MAX_AI_MESSAGE_CHARS or len(context) > MAX_AI_CONTEXT_CHARS:
        raise HTTPException(status_code=413, detail="AI request too large")
    _enforce_rate(
        _ai_hits,
        username,
        AI_RATE_LIMIT,
        AI_RATE_WINDOW,
        "Too many AI requests. Try again shortly.",
    )
