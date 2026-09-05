from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ai_service import ai_service
from auth import User, get_current_admin, get_current_user
from run_limits import MAX_AI_CONTEXT_CHARS, MAX_AI_MESSAGE_CHARS, enforce_ai_limits

router = APIRouter(prefix="/ai", tags=["ai"])


class GenerateExerciseRequest(BaseModel):
    prompt: str
    language: str = "python"


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_AI_MESSAGE_CHARS)
    context: str | None = Field(default="", max_length=MAX_AI_CONTEXT_CHARS)
    understanding_level: str = "Intermediate"


@router.post("/generate/exercise")
def generate_exercise(request: GenerateExerciseRequest, admin: User = Depends(get_current_admin)):
    result = ai_service.generate_exercise(request.prompt, request.language)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.post("/discuss")
def discuss_implementation(request: ChatRequest, user: User = Depends(get_current_user)):
    enforce_ai_limits(user.username, request.message, request.context or "")
    response = ai_service.chat(request.message, request.context, request.understanding_level)
    return {"response": response}
