import os
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ai_service import ai_service
from auth import User, get_current_admin, get_current_user
from learning_paths import LearningResource
from routers.file_courses import COURSES_DIR
from run_limits import MAX_AI_CONTEXT_CHARS, MAX_AI_MESSAGE_CHARS, enforce_ai_limits

router = APIRouter(prefix="/ai", tags=["ai"])


def _find_root_env() -> Path:
    env_override = os.environ.get("ENV_FILE")
    if env_override:
        return Path(env_override)
    cur = Path(__file__).resolve().parent
    for _ in range(6):
        if (cur / ".env").is_file():
            return cur / ".env"
        if (
            (cur / ".git").is_dir() or (cur / "pyproject.toml").is_file()
        ) and cur.name != "backend":
            return cur / ".env"
        cur = cur.parent
    return Path(__file__).resolve().parent.parent.parent / ".env"


def _update_env_file(env_path: Path, key: str, value: str) -> None:
    content = ""
    if env_path.is_file():
        content = env_path.read_text(encoding="utf-8")

    pattern = rf"^\s*{re.escape(key)}=.*"
    replacement = f"{key}={value}"
    if re.search(pattern, content, flags=re.MULTILINE):
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    else:
        if content and not content.endswith("\n"):
            content += "\n"
        new_content = content + f"{replacement}\n"

    env_path.write_text(new_content, encoding="utf-8")


class GenerateExerciseRequest(BaseModel):
    prompt: str
    language: str = "python"


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_AI_MESSAGE_CHARS)
    context: str | None = Field(default="", max_length=MAX_AI_CONTEXT_CHARS)
    understanding_level: str = "Intermediate"


class ConfigureKeyRequest(BaseModel):
    api_key: str


class ConfigureKeyResponse(BaseModel):
    success: bool
    message: str
    saved_to_file: bool


class AIStatusResponse(BaseModel):
    configured: bool
    has_key: bool
    model: str


class BuildCourseRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500)
    resources: list[LearningResource] = Field(default_factory=list, max_length=5)


class ToolTraceRead(BaseModel):
    tool_name: str
    status: str = "completed"
    input_summary: str
    output_summary: str
    details: dict[str, Any] = Field(default_factory=dict)


class BuildCourseResponse(BaseModel):
    slug: str
    title: str
    description: str = ""
    narrative_arc: str = ""
    lesson_count: int
    grounded_in: list[str] = Field(default_factory=list)
    tool_traces: list[ToolTraceRead] = Field(default_factory=list)
    solveit_compliance: dict[str, bool] = Field(default_factory=dict)


@router.get("/status", response_model=AIStatusResponse)
def get_ai_status():
    return AIStatusResponse(
        configured=ai_service.is_configured,
        has_key=bool(os.environ.get("GEMINI_API_KEY")),
        model="gemini-3-flash-preview",
    )


@router.post("/configure-key", response_model=ConfigureKeyResponse)
def configure_key(request: Request, body: ConfigureKeyRequest):
    client_host = request.client.host if request.client else ""
    is_local = (
        client_host in ("127.0.0.1", "localhost", "::1", "testclient")
        or os.environ.get("ALLOW_LOCAL_WELCOME", "false").lower() == "true"
    )
    if not is_local:
        raise HTTPException(
            status_code=403,
            detail="Configuring the API key via this endpoint is only permitted in local development.",
        )

    key = body.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key cannot be empty.")

    ai_service.configure_key(key)
    env_path = _find_root_env()
    try:
        _update_env_file(env_path, "GEMINI_API_KEY", key)
    except Exception as e:
        return ConfigureKeyResponse(
            success=True,
            message=f"API key configured in memory, but could not write to .env: {str(e)}",
            saved_to_file=False,
        )

    return ConfigureKeyResponse(
        success=True,
        message="API key configured and saved to .env",
        saved_to_file=True,
    )


@router.post("/generate/exercise")
def generate_exercise(request: GenerateExerciseRequest, admin: User = Depends(get_current_admin)):
    result = ai_service.generate_exercise(request.prompt, request.language)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.post("/learning-path/build", response_model=BuildCourseResponse)
def build_learning_path(request: BuildCourseRequest, user: User = Depends(get_current_user)):
    """Build a playable, grounded course from a learner's question using agentic tool calls."""
    topic = request.topic.strip()
    if not topic:
        raise HTTPException(status_code=422, detail="A learning topic is required")

    materials = "\n\n".join(r.text for r in request.resources if r.text.strip())

    try:
        result = ai_service.run_agentic_course_builder(
            topic=topic,
            materials=materials,
            username=user.username,
            courses_dir=COURSES_DIR,
        )
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Agentic course creation failed: {exc}") from exc

    return BuildCourseResponse(
        slug=result.slug,
        title=result.title,
        description=result.description,
        narrative_arc=result.narrative_arc,
        lesson_count=result.lesson_count,
        grounded_in=result.grounded_in,
        tool_traces=[
            ToolTraceRead(
                tool_name=t.tool_name,
                status=t.status,
                input_summary=t.input_summary,
                output_summary=t.output_summary,
                details=t.details,
            )
            for t in result.tool_traces
        ],
        solveit_compliance=result.solveit_compliance,
    )


@router.post("/discuss")
def discuss_implementation(request: ChatRequest, user: User = Depends(get_current_user)):
    enforce_ai_limits(user.username, request.message, request.context or "")
    response = ai_service.chat(request.message, request.context, request.understanding_level)
    return {"response": response}
