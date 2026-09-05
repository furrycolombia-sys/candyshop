#!/usr/bin/env bash
# Docker health check — builds the image, runs it on a random port,
# waits for /health, then cleans up.
# Used by: .husky/pre-push (when deploy files change).

set -euo pipefail

IMAGE_NAME="libra-health-check"
CONTAINER_NAME="libra-health-check-$$"

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
#
# CLERK_SECRET_KEY is exported alongside the NEXT_PUBLIC_* vars even though it
# is not a build arg (it must never be baked into the client bundle) — it is a
# runtime secret the container's Clerk middleware reads from its environment,
# so it needs to reach the `docker run -e` call below instead.
if [ -z "${CI:-}" ] && [ -f ".env.dev" ]; then
  echo "Loading env from .env.dev..."
  eval "$(node --input-type=module <<'EOF'
import { loadEnv } from './scripts/load-env.mjs';
loadEnv('dev');
for (const [k, v] of Object.entries(process.env)) {
  if (k.startsWith('NEXT_PUBLIC_') || k === 'CLERK_SECRET_KEY') {
    process.stdout.write(`export ${k}=${JSON.stringify(v)}\n`);
  }
}
EOF
)"
fi

# ── 1. Build ──────────────────────────────────────────────────────────────────
# Build args are read from scripts/lib/docker-build-args.mjs — the single
# source of truth also imported by docker-build.mjs — applied to the env vars
# exported above. Do NOT restate this list here; import it, or it will drift
# (as it did before: this script's own hardcoded copy was missing the Clerk
# keys and every app crashed at boot with "Missing publishableKey").
BUILD_ARGS=$(node --input-type=module <<'EOF'
import { BUILD_ARG_KEYS } from './scripts/lib/docker-build-args.mjs';
for (const k of BUILD_ARG_KEYS) {
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
# CLERK_SECRET_KEY is passed as a runtime -e var, not a --build-arg: it must
# not be baked into the built bundle, only be available to the server process.
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${PORT}:8080" \
  -e "CLERK_SECRET_KEY=${CLERK_SECRET_KEY:-}" \
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
