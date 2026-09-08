from pydantic import EmailStr
from sqlmodel import Field, SQLModel


class UserBase(SQLModel):
    username: str = Field(index=True, unique=True)
    email: EmailStr = Field(unique=True, index=True)
    role: str = Field(default="student")


class User(UserBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    hashed_password: str


class UserCreate(SQLModel):
    username: str
    email: EmailStr
    password: str


class UserRead(UserBase):
    id: int


class Token(SQLModel):
    access_token: str
    token_type: str


class TokenData(SQLModel):
    username: str | None = None
    role: str | None = None


class GoogleTokenRequest(SQLModel):
    credential: str
