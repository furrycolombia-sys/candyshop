#!/usr/bin/env bash
# Docker health check — builds the image, runs it on a random port,
# waits for /health, then cleans up.
# Used by: .husky/pre-push (when deploy files change) + CI docker-smoke-tests job.

set -euo pipefail

IMAGE_NAME="candyshop-health-check"
CONTAINER_NAME="candyshop-health-check-$$"

cleanup() {
  if docker ps -aq -f name="^${CONTAINER_NAME}$" | grep -q .; then
    echo "Cleaning up container $CONTAINER_NAME..."
    docker rm -f "$CONTAINER_NAME" > /dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# ── 1. Build ──────────────────────────────────────────────────────────────────
echo "Building Docker image: $IMAGE_NAME..."
docker build -t "$IMAGE_NAME" -f docker/smoke/Dockerfile . || { echo "ERROR: Docker build failed."; exit 1; }

# ── 2. Pick a random available port ───────────────────────────────────────────
PORT=$(node -e "
  const net = require('net');
  const s = net.createServer();
  s.listen(0, () => { process.stdout.write(String(s.address().port)); s.close(); });
")
echo "Using port $PORT for health check."

# ── 3. Run container ──────────────────────────────────────────────────────────
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${PORT}:8088" \
  "$IMAGE_NAME" > /dev/null

# ── 4. Wait for /health endpoint (max 60s) ────────────────────────────────────
echo "Waiting for /health endpoint..."
ELAPSED=0
until curl -sf "http://localhost:${PORT}/store/health" > /dev/null 2>&1; do
  if [ "$ELAPSED" -ge 60 ]; then
    echo "ERROR: Container did not become healthy within 60s."
    docker logs "$CONTAINER_NAME"
    exit 1
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done
echo "Container is healthy."

# ── 5. E2E smoke tests against the container ──────────────────────────────────
echo "Running E2E smoke tests against container..."
CONTAINER_URL="http://localhost:${PORT}" \
  pnpm --filter store exec playwright test --project=chromium e2e/smoke.spec.ts || {
    echo "ERROR: E2E smoke tests failed."
    docker logs "$CONTAINER_NAME"
    exit 1
  }

echo "Docker health check passed."
