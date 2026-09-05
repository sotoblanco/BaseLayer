"""Promote an existing user to admin. Not exposed as a public API.

Usage from backend/:
    uv run python scripts/promote_admin.py <username>
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select

from database import engine
from models import User


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python scripts/promote_admin.py <username>")
        sys.exit(1)

    username = sys.argv[1]
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if not user:
            print(f"User '{username}' not found")
            sys.exit(1)
        user.role = "admin"
        session.add(user)
        session.commit()
        print(f"Promoted '{username}' to admin")


if __name__ == "__main__":
    main()
