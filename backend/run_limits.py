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
MAX_AI_HISTORY_MESSAGES = 20

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


def _message_content(msg: object) -> str:
    if isinstance(msg, dict):
        return str(msg.get("content") or "")
    content = getattr(msg, "content", None)
    return str(content or "")


def enforce_ai_chat_limits(username: str, messages: list[object], context: str = "") -> None:
    """Enforce size/rate limits for multi-turn chat history.

    Each message is capped at ``MAX_AI_MESSAGE_CHARS`` and the combined request
    (all message contents + context) is capped at ``MAX_AI_CONTEXT_CHARS`` so a
    growing history can never blow past the model's token budget.
    """
    if len(messages) > MAX_AI_HISTORY_MESSAGES:
        raise HTTPException(status_code=413, detail="AI request too large")
    if len(context) > MAX_AI_CONTEXT_CHARS:
        raise HTTPException(status_code=413, detail="AI request too large")

    total = len(context)
    for msg in messages:
        content = _message_content(msg)
        if len(content) > MAX_AI_MESSAGE_CHARS:
            raise HTTPException(status_code=413, detail="AI request too large")
        total += len(content)
    if total > MAX_AI_CONTEXT_CHARS:
        raise HTTPException(status_code=413, detail="AI request too large")

    _enforce_rate(
        _ai_hits,
        username,
        AI_RATE_LIMIT,
        AI_RATE_WINDOW,
        "Too many AI requests. Try again shortly.",
    )
