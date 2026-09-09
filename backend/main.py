import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import auth_router, get_current_user
from database import create_db_and_tables
from models import User
from project_artifacts import build_project_workspace_handlers
from routers.ai import router as ai_router
from routers.file_courses import router as file_courses_router
from routers.me import router as me_router
from run_limits import enforce_run_limits
from run_output import sanitize_run_stderr
from sandbox_exec import SandboxUnavailableError, execute_docker


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="BaseLayer App API", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(file_courses_router)
app.include_router(me_router)


# CORS Setup
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "")
env_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
] + env_origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CodeSubmission(BaseModel):
    code: str
    language: str = "python"
    test_code: str | None = None
    # Explicit submit intent + lesson address. The server never infers
    # "is_submit" from test_code presence: a preliminary Run also sends tests.
    is_submit: bool = False
    course_slug: str = ""
    lesson_slug: str = ""


@app.get("/")
async def read_root():
    return {"status": "ok", "message": "BaseLayer App Backend Running"}


def _record_run_event(user_username: str, submission: CodeSubmission, result: dict) -> None:
    try:
        from learner_profile import record_learner_event

        record_learner_event(
            username=user_username,
            event_type="run_result",
            payload={
                "success": result.get("exit_code") == 0,
                "is_submit": submission.is_submit,
                "language": submission.language,
                "course_slug": submission.course_slug,
                "lesson_slug": submission.lesson_slug,
            },
        )
    except Exception:
        pass


def _should_sanitize_stderr(exit_code: Any, test_code: str | None) -> bool:
    if exit_code in (-1, 124):
        return False
    return bool(test_code and test_code.strip())


def _apply_stderr_sanitization(result: dict, test_code: str | None) -> None:
    if _should_sanitize_stderr(result.get("exit_code"), test_code):
        result["stderr"] = sanitize_run_stderr(result.get("stderr", ""))


def _execute_local_submission(submission: CodeSubmission, setup_ws: Any, inspect_ws: Any) -> dict:
    try:
        result = execute_docker(
            submission.code,
            submission.language,
            submission.test_code or "",
            setup_workspace=setup_ws,
            inspect_workspace=inspect_ws,
        )
    except SandboxUnavailableError as exc:
        return {"stdout": "", "stderr": str(exc), "exit_code": -1}

    _apply_stderr_sanitization(result, submission.test_code)
    return result


@app.post("/run")
def run_code(submission: CodeSubmission, user: User = Depends(get_current_user)):
    enforce_run_limits(
        user.username, submission.code, submission.language, submission.test_code or ""
    )
    _is_proj, lock_error, setup_ws, inspect_ws = build_project_workspace_handlers(
        username=user.username,
        course_slug=submission.course_slug,
        lesson_slug=submission.lesson_slug,
        is_submit=submission.is_submit,
    )
    if lock_error is not None:
        return lock_error

    result = _execute_local_submission(submission, setup_ws, inspect_ws)
    _record_run_event(user.username, submission, result)
    return result
