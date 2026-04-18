#!/bin/bash
set -euo pipefail

# ==============================================================================
# Server-side deploy script (called by webhook receiver)
# Pulls latest code, rebuilds Docker container, restarts.
# Limits build to half the CPU cores to keep the running site responsive.
# ==============================================================================

DEPLOY_DIR="/home/furrycolombia/candyshop"
REPO_URL="${REPO_URL:-https://github.com/furrycolombia-sys/candyshop.git}"
BRANCH="${BRANCH:-main}"
ENV_FILE="${ENV_FILE:-/home/furrycolombia/.env.prod}"
COMPOSE_FILE="$DEPLOY_DIR/docker/compose.yml"
LOCKFILE="/tmp/candyshop-deploy.lock"
MAX_BUILD_CPUS=4

log()  { echo "[DEPLOY] $1"; }
warn() { echo "[WARN] $1"; }
err()  { echo "[ERROR] $1"; exit 1; }

# Kill any previous stuck deploy
if [ -f "$LOCKFILE" ]; then
  OLD_PID=$(cat "$LOCKFILE" 2>/dev/null || true)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    warn "Killing previous deploy (PID $OLD_PID)"
    kill -TERM "$OLD_PID" 2>/dev/null || true
    sleep 3
    kill -9 "$OLD_PID" 2>/dev/null || true
  fi
  rm -f "$LOCKFILE"
fi

echo $$ > "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

log "Starting deploy at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Pull latest code
cd "$DEPLOY_DIR"
git remote set-url origin "$REPO_URL" 2>/dev/null || true
git fetch origin "$BRANCH" --depth 1
git checkout -B "$BRANCH" FETCH_HEAD
git clean -fd
log "Checked out $(git log --oneline -1)"

# Build image explicitly (compose file references prebuilt image and has no build section)
log "Building Docker image (max ${MAX_BUILD_CPUS} CPUs)..."
set -o allexport
# shellcheck disable=SC1090
source "$ENV_FILE"
set +o allexport

BUILD_ARG_KEYS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_AUTH_URL
  NEXT_PUBLIC_AUTH_HOST_URL
  NEXT_PUBLIC_STORE_URL
  NEXT_PUBLIC_ADMIN_URL
  NEXT_PUBLIC_PLAYGROUND_URL
  NEXT_PUBLIC_LANDING_URL
  NEXT_PUBLIC_PAYMENTS_URL
  NEXT_PUBLIC_STUDIO_URL
  NEXT_PUBLIC_BUILD_HASH
  NEXT_PUBLIC_ENABLE_TEST_IDS
  NEXT_PUBLIC_ENV_DEBUG
)

BUILD_ARGS=()
for KEY in "${BUILD_ARG_KEYS[@]}"; do
  VALUE="${!KEY:-}"
  BUILD_ARGS+=(--build-arg "${KEY}=${VALUE}")
done

DOCKER_BUILDKIT=1 docker build \
  -f "$DEPLOY_DIR/docker/smoke/Dockerfile" \
  -t "${SITE_PROD_IMAGE_NAME}" \
  --no-cache \
  --build-arg BUILDKIT_CPU_LIMIT="$MAX_BUILD_CPUS" \
  "${BUILD_ARGS[@]}" \
  "$DEPLOY_DIR"

# Stop old container and start new one
log "Restarting container..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# Wait for health
log "Waiting for health check..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:9090/health > /dev/null 2>&1; then
    log "Container healthy after ${i}s"
    break
  fi
  if [ "$i" -eq 60 ]; then
    warn "Container not healthy after 60s"
    docker logs candyshop-prod --tail 20
  fi
  sleep 1
done

# Prune old images
log "Cleaning up old images..."
docker image prune -f > /dev/null 2>&1

log "Deploy complete at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
