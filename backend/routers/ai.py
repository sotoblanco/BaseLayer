from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ai_service import ai_service
from auth import User, get_current_admin, get_optional_user

router = APIRouter(prefix="/ai", tags=["ai"])


class GenerateExerciseRequest(BaseModel):
    prompt: str
    language: str = "python"


class ChatRequest(BaseModel):
    message: str
    context: str | None = ""
    understanding_level: str = "Intermediate"


@router.post("/generate/exercise")
def generate_exercise(request: GenerateExerciseRequest, admin: User = Depends(get_current_admin)):
    result = ai_service.generate_exercise(request.prompt, request.language)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.post("/discuss")
def discuss_implementation(request: ChatRequest, user: User | None = Depends(get_optional_user)):
    response = ai_service.chat(request.message, request.context, request.understanding_level)
    return {"response": response}
