import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from auth import auth_router, get_current_user
from database import create_db_and_tables
from models import User
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
    "https://sotoblanco263542--code-app-fastapi-app.modal.run",
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
    if os.path.exists("/assets/index.html"):
        return FileResponse("/assets/index.html")
    return {"status": "ok", "message": "BaseLayer App Backend Running"}


@app.post("/run")
def run_code(submission: CodeSubmission, user: User = Depends(get_current_user)):
    enforce_run_limits(
        user.username, submission.code, submission.language, submission.test_code or ""
    )
    execution_env = os.environ.get("EXECUTION_ENV", "docker")

    if execution_env == "modal":
        try:
            # Lazy import to avoid circular dependency
            from modal_app import run_in_sandbox

            result = run_in_sandbox.remote(
                submission.code, submission.language, submission.test_code or ""
            )
            # The remote sandbox echoes raw tracebacks; strip the answer key
            # before the Run console sees it (issue #106).
            if (submission.test_code or "").strip() and result.get("exit_code") not in (
                -1,
                124,
            ):
                result["stderr"] = sanitize_run_stderr(result.get("stderr", ""))
            return result
        except ImportError:
            raise HTTPException(status_code=500, detail="Modal backend not found") from None
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    # Default: Use local Docker (shared executor, identical resource caps/cleanup).
    try:
        result = execute_docker(submission.code, submission.language, submission.test_code or "")
    except SandboxUnavailableError as exc:
        # Docker (or another required executable) not found on the host. Return a
        # structured response instead of raising so the frontend can display a
        # helpful message instead of 'undefined'.
        return {"stdout": "", "stderr": str(exc), "exit_code": -1}

    # Record run result into LEARNING.md (only for runs that actually executed).
    if result.get("exit_code") in (-1, 124):
        return result
    # A failing test run echoes assert source lines (expected values) into the
    # traceback even though the Tests tab is hidden from students. Sanitize the
    # student-facing stderr; author-side verification keeps full tracebacks.
    if (submission.test_code or "").strip():
        result["stderr"] = sanitize_run_stderr(result.get("stderr", ""))
    try:
        from learner_profile import record_learner_event

        record_learner_event(
            username=user.username,
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

    return result


# Serve static assets (JS, CSS, images)
# Check if /assets exists (it will in Modal, but maybe not locally without mount)
if os.path.exists("/assets"):
    app.mount("/assets", StaticFiles(directory="/assets/assets"), name="assets")

    # Catch-all for SPA routing (serving index.html)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API routes to pass through if they weren't caught above
        if (
            full_path.startswith("api/")
            or full_path.startswith("docs")
            or full_path.startswith("openapi.json")
        ):
            raise HTTPException(status_code=404, detail="Not Found")

        # Serve index.html for any other route (React Router handles the rest)
        return FileResponse("/assets/index.html")
