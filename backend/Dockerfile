FROM python:3.11-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy root pyproject.toml and uv.lock (since we are in a workspace)
# Note: In a workspace, you usually need the root lockfile.
# But since this is a sub-context build, we'll assume the workspace is copied correctly or we use uv pip install.
# Given the docker-compose context is ./backend, we might need to adjust.

# Let's adjust the backend Dockerfile to be more robust.
# We'll copy the pyproject.toml first.
COPY pyproject.toml .
# If we have a lockfile in backend, use it.
COPY uv.lock* ./

# Install dependencies using uv
# --no-install-package to avoid installing the app itself yet
RUN uv sync --no-install-project --no-dev

COPY . .

# Run the application
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
