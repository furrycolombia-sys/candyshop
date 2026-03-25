#!/usr/bin/env sh
# Docker Health Check Script
# Builds the Docker image, runs the container, and runs E2E smoke tests against it.
# Used by the pre-push hook when deploy-related files change.

set -eu

# Ensure Docker is in PATH (Docker Desktop on Windows may not be in Git Bash PATH)
for docker_path in \
  "/c/Program Files/Docker/Docker/resources/bin" \
  "$HOME/AppData/Local/Docker/resources/bin" \
  "/usr/local/bin"; do
  if [ -d "$docker_path" ] && ! command -v docker > /dev/null 2>&1; then
    export PATH="$docker_path:$PATH"
  fi
done

if ! command -v docker > /dev/null 2>&1; then
  echo "ERROR: docker command not found. Install Docker Desktop and ensure it's running."
  exit 1
fi

IMAGE_NAME="candyshop-test"
CONTAINER_NAME="candyshop-health-check-$$"
MAX_WAIT=60
POLL_INTERVAL=2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
  echo ""
  echo "Cleaning up container..."
  docker rm -f "$CONTAINER_NAME" > /dev/null 2>&1 || true
}

trap cleanup EXIT

# ─── Step 1: Build Docker image ──────────────────────────────────────────────

printf "${YELLOW}Step 1/3: Building Docker image...${NC}\n"
if ! docker build --no-cache \
  --build-arg NEXT_PUBLIC_ENABLE_TEST_IDS=true \
  --build-arg AUTH_PROVIDER_MODE=mock \
  -t "$IMAGE_NAME" .; then
  printf "${RED}Docker build failed!${NC}\n"
  exit 1
fi
printf "${GREEN}Build successful.${NC}\n"
echo ""

# ─── Step 2: Run container ───────────────────────────────────────────────────

printf "${YELLOW}Step 2/3: Starting container...${NC}\n"

# Use port 0 to let Docker assign a random available port
docker run -d --name "$CONTAINER_NAME" -p 0:80 "$IMAGE_NAME" > /dev/null

# Get the actual assigned port
HOST_PORT=$(docker port "$CONTAINER_NAME" 80 | head -1 | cut -d: -f2)
BASE_URL="http://localhost:${HOST_PORT}"

echo "Container running on port $HOST_PORT"

# Wait for the container to be ready
echo "Waiting for container to be healthy..."
elapsed=0
health_status="000"
while [ $elapsed -lt $MAX_WAIT ]; do
  health_status=$(curl -o /dev/null -s -w "%{http_code}" --max-time 3 "${BASE_URL}/health" 2>/dev/null || echo "000")
  if [ "$health_status" = "200" ]; then
    printf "${GREEN}Container is healthy after ${elapsed}s.${NC}\n"
    break
  fi
  sleep $POLL_INTERVAL
  elapsed=$((elapsed + POLL_INTERVAL))
done

if [ "$health_status" != "200" ]; then
  printf "${RED}Container failed to become healthy within ${MAX_WAIT}s.${NC}\n"
  echo "Container logs:"
  docker logs "$CONTAINER_NAME" 2>&1 | tail -30
  exit 1
fi
echo ""

# ─── Step 3: Run E2E smoke tests ─────────────────────────────────────────────

printf "${YELLOW}Step 3/3: Running E2E smoke tests against Docker container...${NC}\n"
echo ""

# Run only the smoke tests (route health checks).
# Auth flow tests require specific provider configuration and are tested in CI.
if DOCKER_BASE_URL="$BASE_URL" pnpm --filter store exec playwright test --config ../../docker/e2e/playwright.config.ts --grep "Docker Smoke"; then
  echo ""
  printf "${GREEN}Docker smoke tests passed!${NC}\n"
  exit 0
else
  echo ""
  printf "${RED}Docker smoke tests FAILED. Push blocked.${NC}\n"
  exit 1
fi
