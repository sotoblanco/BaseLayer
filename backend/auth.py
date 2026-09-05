import os
import re
import uuid
from datetime import datetime, timedelta

import bcrypt  # Changed: Use bcrypt directly
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from google.auth.transport import requests
from google.oauth2 import id_token
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlmodel import Session, or_, select

from database import get_session
from models import GoogleTokenRequest, Token, User, UserCreate, UserRead

# --- Configuration ---
# Fail fast: a missing or well-known SECRET_KEY makes JWTs forgeable.
SECRET_KEY = (os.getenv("SECRET_KEY") or "").strip()
if not SECRET_KEY or SECRET_KEY == "super-secret-key-change-me-in-production":
    raise RuntimeError(
        "SECRET_KEY is not set or is still the default placeholder value. "
        "Set SECRET_KEY to a long, random value before starting the server "
        '(e.g. `python -c "import secrets; print(secrets.token_hex(32))"`).'
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week for development ease
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

# --- Security Setup ---
# Removed: pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

auth_router = APIRouter(prefix="/auth", tags=["auth"])


# --- Helper Functions ---
def verify_password(plain_password, hashed_password):
    # Changed: Use bcrypt checkpw
    # Ensure bytes
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode("utf-8")
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password)


def get_password_hash(password):
    # Changed: Use bcrypt hashpw
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- Dependencies ---
def _decode_and_lookup_user(token: str, session: Session) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception from None

    user = session.exec(select(User).where(User.username == username)).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)
) -> User:
    return _decode_and_lookup_user(token, session)


async def get_current_user_for_media(
    token_header: str | None = Depends(oauth2_scheme_optional),
    token_query: str | None = Query(None, alias="token"),
    session: Session = Depends(get_session),
) -> User:
    token = token_header or token_query
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _decode_and_lookup_user(token, session)


async def get_optional_user(
    token: str = Depends(oauth2_scheme_optional), session: Session = Depends(get_session)
) -> User | None:
    """
    Returns the user if authenticated, None otherwise.
    Does not raise HTTPException for missing/invalid tokens.
    """
    if not token:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            return None
    except JWTError:
        return None

    return session.exec(select(User).where(User.username == username)).first()


class LocalWelcomeRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)


def local_welcome_enabled() -> bool:
    return os.getenv("ALLOW_LOCAL_WELCOME", "").strip().lower() in {"1", "true", "yes"}


def _slugify_local_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")[:32]
    return slug or "learner"


async def get_current_admin(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have administrative privileges",
        )
    return user


# --- Routes ---


RESERVED_LOCAL_USERNAMES = {
    "admin",
    "administrator",
    "root",
    "superuser",
    "system",
    "mod",
    "moderator",
}


def _validate_local_username(username: str) -> None:
    if username in RESERVED_LOCAL_USERNAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{username}' is reserved and cannot be used for local sessions",
        )


def _get_or_create_local_user(username: str, session: Session) -> User:
    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        user = User(
            username=username,
            email=f"{username}@local.baselayer",
            hashed_password=get_password_hash(str(uuid.uuid4())),
            role="student",
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    if user.email != f"{username}@local.baselayer" or user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This username belongs to a registered account and cannot be accessed via local welcome",
        )
    return user


@auth_router.post("/local-welcome", response_model=Token)
def local_welcome(payload: LocalWelcomeRequest, session: Session = Depends(get_session)):
    if not local_welcome_enabled():
        raise HTTPException(status_code=403, detail="Local welcome is disabled")

    username = _slugify_local_name(payload.name)
    _validate_local_username(username)
    user = _get_or_create_local_user(username, session)

    access_token = create_access_token(
        data={"sub": user.username, "role": "student"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@auth_router.post("/signup", response_model=UserRead)
def signup(user: UserCreate, session: Session = Depends(get_session)):
    # Check if user already exists
    existing_user = session.exec(select(User).where(User.username == user.username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    existing_email = session.exec(select(User).where(User.email == user.email)).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role="student",
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


@auth_router.post("/login", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)
):
    # Check for both username and email
    user = session.exec(
        select(User).where(
            or_(User.username == form_data.username, User.email == form_data.username)
        )
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@auth_router.post("/google", response_model=Token)
def google_login(data: GoogleTokenRequest, session: Session = Depends(get_session)):
    """Verifies Google ID Token and logs user in."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID not configured on server")

    try:
        idinfo = id_token.verify_oauth2_token(data.credential, requests.Request(), GOOGLE_CLIENT_ID)

        # ID token is valid. Get the user's Google info.
        email = idinfo["email"]

        # 1. Check if user already exists
        user = session.exec(select(User).where(User.email == email)).first()

        if not user:
            # 2. Create new user
            # Generate a random username or use email prefix
            base_username = email.split("@")[0]
            username = base_username
            # Append random suffix if username taken
            counter = 1
            while session.exec(select(User).where(User.username == username)).first():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User(
                username=username,
                email=email,
                hashed_password=get_password_hash(
                    str(uuid.uuid4())
                ),  # Random password for OAuth users
                role="student",
            )
            session.add(user)
            session.commit()
            session.refresh(user)

        # 3. Issue JWT
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

    except ValueError:
        # Invalid token
        raise HTTPException(status_code=401, detail="Invalid Google token") from None
