#!/usr/bin/env bash
# Docker health check — builds the image, runs it on a random port,
# waits for /health, then cleans up.
# Used by: .husky/pre-push (when deploy files change).

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

# ── Load env vars from .env.dev if not already set ────────────────────────────
# Always run loadEnv to fill in any missing vars (e.g. app URLs not set by CI).
# loadEnv only writes vars NOT already in process.env, so CI vars always win.
# In CI, all NEXT_PUBLIC_* vars are pre-set via workflow env — skip the loader.
if [ -z "${CI:-}" ] && [ -f ".env.dev" ]; then
  echo "Loading env from .env.dev..."
  eval "$(node --input-type=module <<'EOF'
import { loadEnv } from './scripts/load-env.mjs';
loadEnv('dev');
for (const [k, v] of Object.entries(process.env)) {
  if (k.startsWith('NEXT_PUBLIC_')) {
    process.stdout.write(`export ${k}=${JSON.stringify(v)}\n`);
  }
}
EOF
)"
fi

# ── 1. Build ──────────────────────────────────────────────────────────────────
# Build args are generated dynamically from the exported env vars — same keys
# as docker-build.mjs uses, all sourced from the env loader above.
BUILD_ARGS=$(node --input-type=module <<'EOF'
const keys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_AUTH_URL',
  'NEXT_PUBLIC_AUTH_HOST_URL',
  'NEXT_PUBLIC_STORE_URL',
  'NEXT_PUBLIC_ADMIN_URL',
  'NEXT_PUBLIC_PLAYGROUND_URL',
  'NEXT_PUBLIC_LANDING_URL',
  'NEXT_PUBLIC_PAYMENTS_URL',
  'NEXT_PUBLIC_STUDIO_URL',
  'NEXT_PUBLIC_BUILD_HASH',
  'NEXT_PUBLIC_ENABLE_TEST_IDS',
  'NEXT_PUBLIC_ENV_DEBUG',
];
for (const k of keys) {
  process.stdout.write(`--build-arg ${k}=${process.env[k] ?? ''}\n`);
}
EOF
)

# ── Windows: clean pnpm .ignored_* files before building ─────────────────────
# pnpm creates node_modules/.ignored_api, .ignored_auth, etc. with restricted
# NTFS permissions that prevent Docker Desktop's build context sender from
# enumerating them — even though apps/*/node_modules is excluded in
# .dockerignore, the sender must stat every file before applying exclusion
# rules. These files are pnpm-internal markers; deleting them is safe.
find . -name ".ignored_*" -delete 2>/dev/null || true

echo "Building Docker image: $IMAGE_NAME..."
# shellcheck disable=SC2086
docker build \
  -t "$IMAGE_NAME" \
  -f docker/ci/Dockerfile \
  $BUILD_ARGS \
  . || { echo "ERROR: Docker build failed."; exit 1; }

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
  -p "${PORT}:80" \
  "$IMAGE_NAME" > /dev/null

# ── 4. Wait for /health endpoint (max 60s) ────────────────────────────────────
echo "Waiting for /health endpoint..."
ELAPSED=0
until curl -sf "http://localhost:${PORT}/health" > /dev/null 2>&1; do
  if [ "$ELAPSED" -ge 60 ]; then
    echo "ERROR: Container did not become healthy within 60s."
    docker logs "$CONTAINER_NAME"
    exit 1
  fi
  node -e "setTimeout(()=>{},2000)" 2>/dev/null || true
  ELAPSED=$((ELAPSED + 2))
done
echo "Container is healthy."

# ── 5. Docker health tests against the container ─────────────────────────────
echo "Running Docker health tests against container..."
CONTAINER_URL="http://localhost:${PORT}" \
  pnpm --filter store exec playwright test --config="$(pwd)/docker/ci/playwright.config.ts" || {
    echo "ERROR: Docker health tests failed."
    docker logs "$CONTAINER_NAME"
    exit 1
  }

echo "Docker health check passed."
