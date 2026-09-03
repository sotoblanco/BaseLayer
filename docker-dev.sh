#!/bin/bash
# =============================================================================
# docker-dev.sh -- Launch BaseLayer in Docker containers
#
# Usage:
#   ./docker-dev.sh          Build and start all services
#   ./docker-dev.sh down     Stop all services
#   ./docker-dev.sh test     Run backend tests inside the container
#   ./docker-dev.sh logs     Follow logs from all services
#   ./docker-dev.sh rebuild  Force rebuild images (e.g. after Dockerfile changes)
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log()   { echo -e "${GREEN}[DOCKER-DEV]${NC} $1"; }
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---------- Generate .env.docker from .env ----------
generate_docker_env() {
    if [ ! -f .env ]; then
        error ".env file not found. Copy .env.example to .env and fill in your keys."
        exit 1
    fi

    log "Generating .env.docker from .env (stripping 'export' prefixes)..."
    sed 's/^export //' .env > .env.docker
    log ".env.docker is ready."
}

# ---------- Commands ----------
cmd_up() {
    generate_docker_env
    log "Building and starting containers..."
    docker compose up --build -d
    echo ""
    log "Services are running!"
    info "Frontend: http://localhost:5173"
    info "Backend:  http://localhost:8000"
    echo ""
    info "Run './docker-dev.sh logs' to follow output."
    info "Run './docker-dev.sh down' to stop."
}

cmd_down() {
    log "Stopping containers..."
    docker compose down
    log "Containers stopped."
}

cmd_test() {
    log "Running backend tests inside the container..."
    docker compose exec backend uv run pytest tests/ -v --tb=short
}

cmd_logs() {
    docker compose logs -f
}

cmd_rebuild() {
    generate_docker_env
    log "Rebuilding images from scratch..."
    docker compose build --no-cache
    log "Rebuild complete. Run './docker-dev.sh' to start."
}

# ---------- Entrypoint ----------
case "${1:-up}" in
    up)       cmd_up ;;
    down)     cmd_down ;;
    test)     cmd_test ;;
    logs)     cmd_logs ;;
    rebuild)  cmd_rebuild ;;
    *)
        echo "Usage: $0 {up|down|test|logs|rebuild}"
        exit 1
        ;;
esac
