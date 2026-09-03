from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel


class CourseBase(SQLModel):
    title: str
    description: str
    slug: str = Field(index=True, unique=True)
    is_published: bool = False


class UserBase(SQLModel):
    username: str = Field(index=True, unique=True)
    email: EmailStr = Field(unique=True, index=True)
    role: str = Field(default="student")


class User(UserBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    hashed_password: str


class UserCreate(UserBase):
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


class Course(CourseBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    exercises: list["Exercise"] = Relationship(back_populates="course")


class ExerciseBase(SQLModel):
    title: str
    slug: str = Field(index=True)
    description: str  # Markdown content
    language: str = Field(default="python")
    initial_code: str
    test_code: str
    order: int = 0
    passing_rule: str = Field(default="tests_pass")  # "tests_pass", "ai_eval", "manual"
    course_id: int | None = Field(default=None, foreign_key="course.id")


class Exercise(ExerciseBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    course: Course | None = Relationship(back_populates="exercises")


class CourseCreate(CourseBase):
    pass


class CourseRead(CourseBase):
    id: int
    exercises: list["ExerciseRead"] = []


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseUpdate(SQLModel):
    title: str | None = None
    slug: str | None = None
    description: str | None = None
    language: str | None = None
    initial_code: str | None = None
    test_code: str | None = None
    order: int | None = None
    passing_rule: str | None = None
    course_id: int | None = None


class ExerciseRead(ExerciseBase):
    id: int


# Update forward refs
CourseRead.model_rebuild()
