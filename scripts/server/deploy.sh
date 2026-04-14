#!/bin/bash
set -euo pipefail

# =============================================================================
# Server-side deploy script (called by webhook receiver)
# Pulls latest code, rebuilds Docker container (no cache), restarts.
# =============================================================================

DEPLOY_DIR="/home/furrycolombia/candyshop"
REPO_URL="${REPO_URL:-https://github.com/furrycolombia-sys/candyshop.git}"
BRANCH="${BRANCH:-main}"
ENV_FILE="${ENV_FILE:-/home/furrycolombia/.env.prod}"
COMPOSE_FILE="$DEPLOY_DIR/docker/compose.yml"

log()  { echo "[DEPLOY] $1"; }
warn() { echo "[WARN] $1"; }
err()  { echo "[ERROR] $1"; exit 1; }

log "Starting deploy at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Pull latest code
cd "$DEPLOY_DIR"
git remote set-url origin "$REPO_URL" 2>/dev/null || true
git fetch origin "$BRANCH" --depth 1
git checkout -B "$BRANCH" FETCH_HEAD
git clean -fd
log "Checked out $(git log --oneline -1)"

# Rebuild container from scratch (no cache)
log "Building Docker image (no cache)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache

# Stop old container and start new one
log "Restarting container..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# Wait for health
log "Waiting for health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:9090/health > /dev/null 2>&1; then
    log "Container healthy after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then
    warn "Container not healthy after 30s"
    docker logs candyshop-prod --tail 20
  fi
  sleep 1
done

# Prune old images
log "Cleaning up old images..."
docker image prune -f > /dev/null 2>&1

log "Deploy complete at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
