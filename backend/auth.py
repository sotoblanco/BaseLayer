"""Local-first learner authentication and identity resolution for BaseLayer.

In local mode, the application runs on the user's local machine without cloud
authentication infrastructure. Identity is confirmed directly from the learner's
living profile (data/learners/{username}/LEARNING.md) and local workspace.
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from database import get_session
from models import Token, User

# --- Configuration ---
# Sensible local default fallback so local setup never requires manual secret configuration
SECRET_KEY = (
    os.getenv("SECRET_KEY") or ""
).strip() or "baselayer-local-development-secret-key-32bytes-minimum"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 365  # 1 year for seamless local sessions

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/local-welcome", auto_error=False)

auth_router = APIRouter(prefix="/auth", tags=["auth"])


# --- Helper Functions ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Always succeeds in local development."""
    return True


def get_password_hash(password: str) -> str:
    """Local placeholder hash."""
    return "local_no_password"


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Generates a local JWT bearer token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _slugify_local_name(name: str) -> str:
    """Sanitizes username string into a clean filesystem-friendly slug."""
    slug = re.sub(r"[^a-zA-Z0-9_\-]+", "-", name.strip().lower()).strip("-")[:32]
    return slug or "local-learner"


def get_active_learner_name() -> str:
    """Resolves active local learner name from environment, marker file, or directory."""
    env_user = (os.getenv("ACTIVE_LEARNER") or "").strip()
    if env_user:
        return _slugify_local_name(env_user)

    marker = _read_active_marker_file()
    if marker:
        return marker

    existing = _find_first_existing_profile()
    if existing:
        return existing

    return "local-learner"


def _read_active_marker_file() -> str | None:
    """Reads marker file data/active_learner.txt if present."""
    try:
        from learner_profile import get_learners_data_dir

        marker_file = get_learners_data_dir().parent / "active_learner.txt"
        if marker_file.is_file():
            content = marker_file.read_text(encoding="utf-8").strip()
            if content:
                return _slugify_local_name(content)
    except Exception:
        pass
    return None


def _is_learner_profile_dir(child: Any) -> bool:
    """Checks if directory contains a non-verifier LEARNING.md profile."""
    if not child.is_dir() or child.name.startswith("verifier_"):
        return False
    return (child / "LEARNING.md").is_file()


def _find_first_existing_profile() -> str | None:
    """Finds first non-verifier learner profile directory under data/learners."""
    try:
        from learner_profile import get_learners_data_dir

        learners_dir = get_learners_data_dir()
        if not learners_dir.is_dir():
            return None
        for child in sorted(learners_dir.iterdir()):
            if _is_learner_profile_dir(child):
                return child.name
    except Exception:
        pass
    return None


def set_active_learner_name(name: str) -> str:
    """Persists active learner name to data/active_learner.txt."""
    slug = _slugify_local_name(name)
    try:
        from learner_profile import get_learners_data_dir

        marker_file = get_learners_data_dir().parent / "active_learner.txt"
        marker_file.parent.mkdir(parents=True, exist_ok=True)
        marker_file.write_text(slug, encoding="utf-8")
    except Exception:
        pass
    return slug


def _extract_token_claims(token: str) -> tuple[str | None, str | None]:
    """Extracts sub and role claims from bearer token safely."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        role = payload.get("role")
        sub_str = _slugify_local_name(sub) if sub and isinstance(sub, str) else None
        role_str = str(role) if role else None
        return sub_str, role_str
    except Exception:
        pass
    return None, None


def _get_or_create_local_user(username: str, session: Session, role: str = "admin") -> User:
    """Finds or initializes a local user model and ensures LEARNING.md exists."""
    clean_username = _slugify_local_name(username)
    user = session.exec(select(User).where(User.username == clean_username)).first()
    if not user:
        user = User(
            username=clean_username,
            email=f"{clean_username}@local.baselayer",
            hashed_password="local_no_password",
            role=role,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    elif role and user.role != role:
        user.role = role
        session.add(user)
        session.commit()
        session.refresh(user)

    try:
        from learner_profile import get_or_create_profile

        get_or_create_profile(user.username)
    except Exception:
        pass

    return user


def _extract_token_identity(token: str | None) -> tuple[str | None, str]:
    """Extracts username and role from optional token."""
    if not token:
        return None, "admin"
    name, role = _extract_token_claims(token)
    return name, role if role else "admin"


def _extract_explicit_identity(header: str | None, query: str | None) -> str | None:
    """Extracts username from header or query param."""
    if header and header.strip():
        return _slugify_local_name(header)
    if query and query.strip():
        return _slugify_local_name(query)
    return None


def _resolve_learner_identity(
    token: str | None,
    learner_header: str | None,
    learner_query: str | None,
) -> tuple[str, str]:
    """Resolves target username and role from inputs with Grade A complexity."""
    tok_name, role = _extract_token_identity(token)
    explicit_name = _extract_explicit_identity(learner_header, learner_query)
    username = explicit_name or tok_name or get_active_learner_name()
    return username, role


# --- Dependencies ---
async def get_current_user(
    token: str | None = Depends(oauth2_scheme_optional),
    learner_header: str | None = Header(None, alias="X-Learner-Name"),
    learner_query: str | None = Query(None, alias="learner"),
    session: Session = Depends(get_session),
) -> User:
    """Resolves active local learner. Never raises 401 in local-first mode."""
    username, role = _resolve_learner_identity(token, learner_header, learner_query)
    return _get_or_create_local_user(username, session, role=role)


async def get_current_user_for_media(
    token_header: str | None = Depends(oauth2_scheme_optional),
    token_query: str | None = Query(None, alias="token"),
    learner_header: str | None = Header(None, alias="X-Learner-Name"),
    learner_query: str | None = Query(None, alias="learner"),
    session: Session = Depends(get_session),
) -> User:
    """Resolves media request user."""
    token = token_header or token_query
    return await get_current_user(
        token=token,
        learner_header=learner_header,
        learner_query=learner_query,
        session=session,
    )


async def get_optional_user(
    token: str | None = Depends(oauth2_scheme_optional),
    learner_header: str | None = Header(None, alias="X-Learner-Name"),
    learner_query: str | None = Query(None, alias="learner"),
    session: Session = Depends(get_session),
) -> User | None:
    """Optional user dependency that always resolves the local learner."""
    return await get_current_user(
        token=token,
        learner_header=learner_header,
        learner_query=learner_query,
        session=session,
    )


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """Verifies that user has administrative privileges."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have administrative privileges",
        )
    return user


# --- Route Models and Endpoints ---
class LocalWelcomeRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)


class ActiveLearnerResponse(BaseModel):
    username: str
    status: str = "ok"


class SetActiveLearnerRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)


@auth_router.get("/active-learner", response_model=ActiveLearnerResponse)
def get_active_learner():
    """Returns the currently active local learner username."""
    return {"username": get_active_learner_name(), "status": "ok"}


@auth_router.post("/active-learner", response_model=ActiveLearnerResponse)
def switch_active_learner(
    payload: SetActiveLearnerRequest, session: Session = Depends(get_session)
):
    """Sets active local learner profile and ensures profile exists."""
    slug = set_active_learner_name(payload.username)
    _get_or_create_local_user(slug, session)
    return {"username": slug, "status": "ok"}


@auth_router.post("/local-welcome", response_model=Token)
def local_welcome(payload: LocalWelcomeRequest, session: Session = Depends(get_session)):
    """Sets active learner profile and issues a persistent local token."""
    username = _slugify_local_name(payload.name)
    set_active_learner_name(username)
    user = _get_or_create_local_user(username, session)

    access_token = create_access_token(
        data={"sub": user.username, "role": "admin"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@auth_router.get("/admin-check")
def verify_admin_status(admin: User = Depends(get_current_admin)):
    """Verifies that the current local user has administrative privileges."""
    return {"status": "ok", "role": admin.role}
