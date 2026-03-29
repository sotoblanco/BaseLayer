#!/bin/bash

# Definition of colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper function for logging
log() {
    echo -e "${GREEN}[DEV]${NC} $1"
}

# Load environment variables if .env exists
if [ -f .env ]; then
    log "Loading .env file"
    source ./.env
fi

# Ensure common paths are in PATH (for uv, etc.)
export PATH="$HOME/.cargo/bin:$PATH"

# --- Environment Setup ---

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    error "uv not found."
    echo -e "${BLUE}[TIP] Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh${NC}"
    exit 1
fi

# Automatically sync dependencies if .venv is missing
if [ ! -d ".venv" ]; then
    log "Virtual environment missing. Initializing with uv sync..."
    uv sync
    if [ $? -ne 0 ]; then
        error "uv sync failed. Please check your pyproject.toml."
        exit 1
    fi
fi

# Cleanup function to kill background processes
cleanup() {
    log "Stopping services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Check for Docker (needed for sandbox-runner)
if ! command -v docker &> /dev/null || ! docker info &> /dev/null; then
    echo -e "${RED}[WARNING] Docker is not running or not installed.${NC}"
    echo -e "${RED}[WARNING] The 'sandbox-runner' image cannot be built.${NC}"
    echo -e "${RED}[WARNING] Code execution features will NOT work.${NC}"
    echo -e "${BLUE}[INFO] Continuing to start frontend and backend...${NC}"
else
    # Build Sandbox Runner Image only if it doesn't already exist
    if ! docker image inspect sandbox-runner:latest >/dev/null 2>&1; then
        log "Building sandbox-runner Docker image..."
        docker build -t sandbox-runner ./sandbox
        if [ $? -ne 0 ]; then
            error "Failed to build sandbox-runner image. Proceeding anyway..."
        else
            log "Sandbox image built successfully."
        fi
    else
        log "sandbox-runner image already exists, skipping build (use \`docker build\` manually after making changes)."
    fi
fi

# Start Backend
log "Starting Backend..."
cd backend
# Check if uv is installed
if ! command -v uv &> /dev/null; then
    error "uv not found."
    echo -e "${BLUE}[TIP] Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh${NC}"
    exit 1
fi

uv run uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start Frontend
log "Starting Frontend..."
cd frontend

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    error "npm not found."
    echo -e "${BLUE}[TIP] Install it with: brew install node${NC}"
    kill $BACKEND_PID
    exit 1
fi

# Proactively check for node_modules
if [ ! -d "node_modules" ]; then
    log "node_modules missing. Running npm install..."
    npm install
    if [ $? -ne 0 ]; then
        error "npm install failed."
        kill $BACKEND_PID
        exit 1
    fi
fi

npm run dev &
FRONTEND_PID=$!
cd ..

log "Services are running!"
log "Backend: http://localhost:8000"
log "Frontend: http://localhost:5173"

# Wait for all background processes
wait
