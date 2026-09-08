import threading
import time
import uuid
from typing import Any

from pydantic import BaseModel, Field

from agentic_workflow import AgenticWorkflowResult

# Plans expire after 2 hours if not approved
PLAN_TTL_SECONDS = 7200


class StoredCoursePlan(BaseModel):
    plan_id: str
    username: str = ""
    created_at: float = Field(default_factory=time.time)
    plan: AgenticWorkflowResult


class CoursePlanStore:
    def __init__(self, ttl_seconds: int = PLAN_TTL_SECONDS):
        self._plans: dict[str, StoredCoursePlan] = {}
        self._lock = threading.Lock()
        self._ttl_seconds = ttl_seconds

    def _evict_expired(self, now: float) -> None:
        expired = [
            k
            for k, v in self._plans.items()
            if now - v.created_at > self._ttl_seconds
        ]
        for k in expired:
            self._plans.pop(k, None)

    def save(self, plan: AgenticWorkflowResult, username: str = "") -> str:
        with self._lock:
            now = time.time()
            self._evict_expired(now)
            plan_id = str(uuid.uuid4())
            self._plans[plan_id] = StoredCoursePlan(
                plan_id=plan_id,
                username=username,
                created_at=now,
                plan=plan,
            )
            return plan_id

    def get(self, plan_id: str) -> StoredCoursePlan | None:
        with self._lock:
            now = time.time()
            self._evict_expired(now)
            return self._plans.get(plan_id)

    def delete(self, plan_id: str) -> None:
        with self._lock:
            self._plans.pop(plan_id, None)

    def clear(self) -> None:
        with self._lock:
            self._plans.clear()


plan_store = CoursePlanStore()
