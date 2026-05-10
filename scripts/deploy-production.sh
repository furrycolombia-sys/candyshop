#!/bin/bash
set -euo pipefail

# =============================================================================
# Production Deployment Script for hestia.local
# Runs ON the server via SSH from GitHub Actions.
#
# CI builds all 7 apps, rsyncs .next/ dirs to this server, then runs this
# script. This script rebuilds the Docker image from those pre-built artifacts
# and hot-swaps the running container.
# =============================================================================

# ─── Cloudflare Access SSH disconnect guard ───────────────────────────────────
# Rebuilding the Docker image takes 1-2 minutes. The Cloudflare Access WebSocket
# proxy drops idle TCP connections before it finishes, causing
# "client_loop: send disconnect: Broken pipe" in CI.
#
# Fix: on first invocation, re-launch ourselves detached from the SSH session
# via nohup, then tail the log back through the same connection so CI output
# keeps flowing. Even if SSH drops after this, the build continues on-server.
# ─────────────────────────────────────────────────────────────────────────────
if [ -z "${DEPLOY_DETACHED:-}" ]; then
  DEPLOY_LOG=/tmp/deploy-candyshop.log
  DEPLOY_DONE=/tmp/deploy-candyshop.done
  rm -f "$DEPLOY_LOG" "$DEPLOY_DONE"

  DEPLOY_DETACHED=1 nohup bash "$0" "$@" >"$DEPLOY_LOG" 2>&1 &
  BG_PID=$!

  # Stream log back — keeps the SSH/WebSocket alive AND surfaces build output.
  # GNU tail exits automatically when the watched PID exits (Linux coreutils).
  if tail -f "$DEPLOY_LOG" --pid="$BG_PID" 2>/dev/null; then
    :
  else
    # Fallback for non-GNU tail: background-tail + manual wait
    tail -f "$DEPLOY_LOG" &
    TAIL_PID=$!
    while kill -0 "$BG_PID" 2>/dev/null; do sleep 5; done
    sleep 2
    kill "$TAIL_PID" 2>/dev/null || true
  fi

  DEPLOY_EXIT=$(cat "$DEPLOY_DONE" 2>/dev/null || echo 1)
  exit "$DEPLOY_EXIT"
fi

# ─── Telegram deploy notifications ───────────────────────────────────────────
# Extract Telegram vars early from the env file so we can notify before the full
# env is sourced (which happens later, just before the build step).
_tg_env="${ENV_FILE:-/tmp/.candyshop-build.env}"
if [ -f "$_tg_env" ]; then
  TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$(grep '^TELEGRAM_BOT_TOKEN=' "$_tg_env" | cut -d= -f2- 2>/dev/null || true)}"
  TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-$(grep '^TELEGRAM_CHAT_ID=' "$_tg_env" | cut -d= -f2- 2>/dev/null || true)}"
  TELEGRAM_THREAD_ID="${TELEGRAM_THREAD_ID:-$(grep '^TELEGRAM_THREAD_ID=' "$_tg_env" | cut -d= -f2- 2>/dev/null || true)}"
fi
# Sanitize hostname once: only RFC-1123-valid chars so it can't break the Python
# string literal or inject HTML into Telegram messages.
_safe_hostname=$(printf '%s' "$HOSTNAME" | tr -dc '[:alnum:]._-')
TELEGRAM_SOURCE="${_safe_hostname}"

_telegram_send() {
  local thread_id="$1" text="$2"
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] || return 0
  [ -n "${TELEGRAM_CHAT_ID:-}" ] || return 0
  command -v python3 >/dev/null 2>&1 || return 0
  local payload
  payload=$(python3 -c "
import json, sys
d = {'chat_id': sys.argv[1], 'text': sys.argv[2] + '\n\n\U0001F4CD ' + sys.argv[4], 'parse_mode': 'HTML'}
if sys.argv[3]:
    d['message_thread_id'] = int(sys.argv[3])
print(json.dumps(d))" "$TELEGRAM_CHAT_ID" "$text" "$thread_id" "$TELEGRAM_SOURCE") || return 0
  curl -sf --max-time 10 -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H 'Content-Type: application/json' \
    -d "$payload" >/dev/null 2>&1 || true
}

# Regular channel — deploy steps, recoveries, info
notify_telegram() {
  _telegram_send "${TELEGRAM_THREAD_ID:-}" "$1"
}

# Critical channel — DOWN alerts, resource warnings, failures
notify_telegram_critical() {
  _telegram_send "${TELEGRAM_CRITICAL_THREAD_ID:-${TELEGRAM_THREAD_ID:-}}" "$1"
}

# Returns human-readable duration from a start timestamp: "2m 14s" or "38s"
_dur() {
  local secs=$(( $(date +%s) - $1 ))
  if [ "$secs" -ge 60 ]; then
    printf '%dm %ds' $(( secs / 60 )) $(( secs % 60 ))
  else
    printf '%ds' "$secs"
  fi
}

# Write exit code + send deploy result notification
DEPLOY_START=$(date +%s)
_on_exit() {
  local code=$?
  echo $code >/tmp/deploy-candyshop.done
  local dur
  dur="$(_dur $DEPLOY_START)"
  local commit="${DEPLOY_COMMIT:-unknown}"
  if [ "$code" -eq 0 ]; then
    notify_telegram "$(printf '✅ <b>Deploy complete</b>  •  <code>%s</code>\nBranch: <code>%s</code>\nCommit: <code>%s</code>\nTotal: %s' \
      "$_safe_hostname" "$BRANCH" "$commit" "$dur")"
  else
    notify_telegram_critical "$(printf '❌ <b>Deploy FAILED</b> (exit %s)  •  <code>%s</code>\nBranch: <code>%s</code>\nCommit: <code>%s</code>\nTotal: %s' \
      "$code" "$_safe_hostname" "$BRANCH" "$commit" "$dur")"
  fi
}
trap _on_exit EXIT
# ─────────────────────────────────────────────────────────────────────────────

DEPLOY_DIR="${DEPLOY_DIR:-/home/furrycolombia/candyshop}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
CONTAINER_NAME="${SITE_PROD_CONTAINER_NAME:-candyshop-prod}"
HOST_PORT="${HOST_PORT:-9090}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 22 --silent || err "Node 22 not available via nvm"

log "Node $(node --version) | PM2 $(pm2 --version)"
notify_telegram "$(printf '🚀 <b>Deploy started</b>  •  <code>%s</code>\nBranch: <code>%s</code>' "$_safe_hostname" "$BRANCH")"

# =============================================================================
# Sync repository (works whether DEPLOY_DIR is absent, non-empty, or already a repo)
# =============================================================================
_STEP_START=$(date +%s)
log "Syncing repository..."
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"
if [ ! -d ".git" ]; then
  git init -q
  git remote add origin "$REPO_URL"
else
  git remote set-url origin "$REPO_URL" 2>/dev/null || true
fi
git fetch origin "$BRANCH" --depth 1
git checkout -B "$BRANCH" FETCH_HEAD
git clean -fd

cd "$DEPLOY_DIR"
DEPLOY_COMMIT=$(git log --format="%h %s" -1 2>/dev/null || true)
log "Checked out $DEPLOY_COMMIT"
notify_telegram "$(printf '📥 <b>Code pulled</b> (%s)\nCommit: <code>%s</code>' "$(_dur $_STEP_START)" "$DEPLOY_COMMIT")"

# Remove .secrets — builds happen in CI, not on this server.
rm -f "$DEPLOY_DIR/.secrets"

# =============================================================================
# Load runtime env vars (written by CI, deleted after deploy)
# Build artifacts are pre-built in CI and rsync'd here before this script runs.
# We source the env file so the container and watcher inherit runtime-only
# secrets (SUPABASE_SERVICE_ROLE_KEY, Telegram tokens, etc.).
# =============================================================================
ENV_FILE="${ENV_FILE:-/tmp/.candyshop-build.env}"
if [ -f "$ENV_FILE" ]; then
  log "Loading runtime env from $ENV_FILE"
  while IFS= read -r _line || [ -n "$_line" ]; do
    [[ -z "$_line" || "$_line" == \#* ]] && continue
    _key="${_line%%=*}"
    _val="${_line#*=}"
    [[ "$_key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    export "$_key=$_val"
  done < "$ENV_FILE"
else
  warn "No env file found at $ENV_FILE — container may lack runtime secrets"
fi

# =============================================================================
# Obtain the Docker image.
# GCP: CI builds in GitHub Actions (7 GB RAM) and pushes to GHCR; we pull.
# Local/fallback: build from the CI-rsynced pre-built artifacts on this server.
# =============================================================================
_STEP_START=$(date +%s)
if [ -n "${DOCKER_IMAGE:-}" ]; then
  log "Pulling pre-built Docker image: $DOCKER_IMAGE"
  if [ -n "${GHCR_TOKEN:-}" ]; then
    echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USERNAME:-github}" --password-stdin \
      || warn "GHCR login failed — attempting pull unauthenticated"
  fi
  docker pull "$DOCKER_IMAGE" || err "Docker image pull failed"
  IMAGE_TAG="$DOCKER_IMAGE"
  log "Image pulled: $IMAGE_TAG (took $(_dur $_STEP_START))"
  notify_telegram "$(printf '🐳 <b>Image pulled</b> (%s)\n<code>%s</code>' "$(_dur $_STEP_START)" "$IMAGE_TAG")"
else
  log "Building Docker image from pre-built artifacts..."
  IMAGE_TAG="candyshop-prod:$(git rev-parse --short HEAD 2>/dev/null || date +%s)"

  # Ensure every path the Dockerfile COPYs exists (artifacts may omit empty dirs).
  for APP in store auth admin landing payments studio playground; do
    mkdir -p "$DEPLOY_DIR/apps/$APP/.next/static"
    mkdir -p "$DEPLOY_DIR/apps/$APP/public"
  done

  docker build \
    -f "$DEPLOY_DIR/docker/prod/Dockerfile" \
    -t "$IMAGE_TAG" \
    "$DEPLOY_DIR" \
    || err "Docker image build failed"

  log "Image built: $IMAGE_TAG (took $(_dur $_STEP_START))"
  notify_telegram "$(printf '🐳 <b>Image built</b> (%s)\n<code>%s</code>' "$(_dur $_STEP_START)" "$IMAGE_TAG")"
fi

# =============================================================================
# Hot-swap the container (traffic resumes within seconds of docker run)
# =============================================================================
log "Restarting container '$CONTAINER_NAME'..."
_STEP_START=$(date +%s)

# Create boot progress message; container edits it live via TELEGRAM_BOOT_MSG_ID
_BOOT_MSG_ID=""
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  _boot_now=$(python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'))" 2>/dev/null || true)
  _BOOT_RESP=$(python3 -c "
import json, os, sys, urllib.request
hostname  = sys.argv[1]
boot_now  = sys.argv[2]
chat_id   = os.environ.get('TELEGRAM_CHAT_ID', '')
thread    = os.environ.get('TELEGRAM_THREAD_ID', '')
bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
if not (chat_id and bot_token):
    raise SystemExit(0)
text = (
  '\U0001f504 <b>Container Boot</b>  •  <code>' + hostname + '</code>  •  ' + boot_now + '\n\n'
  'Progress: 0/7  ░░░░░░░░░░░░░░░░  0%\n\n'
  '  ⏳ auth         ...\n'
  '  ⏳ store        ...\n'
  '  ⏳ admin        ...\n'
  '  ⏳ playground   ...\n'
  '  ⏳ landing      ...\n'
  '  ⏳ payments     ...\n'
  '  ⏳ studio       ...\n'
  '  ⏳ nginx        waiting for all apps...\n\n'
  'Elapsed: 0s'
)
payload = {'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}
if thread:
    payload['message_thread_id'] = int(thread)
data = json.dumps(payload).encode()
req = urllib.request.Request(
    'https://api.telegram.org/bot' + bot_token + '/sendMessage',
    data=data, headers={'Content-Type': 'application/json'}, method='POST')
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        resp = json.loads(r.read())
        if resp.get('ok'):
            print(resp['result']['message_id'])
except Exception:
    pass
" "$_safe_hostname" "${_boot_now:-}" 2>/dev/null || true)
  _BOOT_MSG_ID="${_BOOT_RESP:-}"
fi

docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "${HOST_PORT}:8080" \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  --pids-limit=1024 \
  --oom-score-adj=800 \
  -e "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}" \
  -e "TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}" \
  -e "TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-}" \
  -e "TELEGRAM_THREAD_ID=${TELEGRAM_THREAD_ID:-}" \
  -e "TELEGRAM_CRITICAL_THREAD_ID=${TELEGRAM_CRITICAL_THREAD_ID:-}" \
  -e "TELEGRAM_BOOT_MSG_ID=${_BOOT_MSG_ID:-}" \
  -e "SERVER_HOSTNAME=${_safe_hostname}" \
  "$IMAGE_TAG" \
  || err "Docker container start failed"

log "Container started (took $(_dur $_STEP_START))"

# Keep only the 2 most recent images; prune older ones (handles both local
# candyshop-prod:sha tags and ghcr.io/.../candyshop-prod:sha tags)
docker images --format '{{.Repository}}:{{.Tag}}' \
  | grep 'candyshop-prod' \
  | sort -r \
  | tail -n +3 \
  | xargs -r docker rmi 2>/dev/null || true

# Clean up env file — secrets must not persist on disk
rm -f "$ENV_FILE"

# =============================================================================
# Start host-side health watcher
# WATCHER_NGINX_PORT makes it check apps via Docker nginx (the real traffic path:
#   Cloudflare → Hestia nginx → Docker nginx → apps)
# rather than internal ports, so alerts reflect what users actually experience.
# =============================================================================
log "Starting health watcher..."
pm2 delete candyshop-watcher 2>/dev/null || true
WATCHER_NGINX_PORT=$HOST_PORT SERVER_HOSTNAME=$_safe_hostname pm2 start "$DEPLOY_DIR/docker/watcher.mjs" \
  --name candyshop-watcher

pm2 delete candyshop-boot-notifier 2>/dev/null || true
WATCHER_NGINX_PORT=$HOST_PORT SERVER_HOSTNAME=$_safe_hostname pm2 start "$DEPLOY_DIR/scripts/server/boot-notifier.mjs" \
  --name candyshop-boot-notifier || warn "boot-notifier failed to start (non-critical)"

# Persist both processes across reboots
pm2 save

# =============================================================================
# Health check via Docker nginx
# After PM2 starts, V8 is cold — the first real user request would pay a
# compilation penalty on every route. We hit each app's key localized pages
# 3 times so V8 JIT-compiles the hot paths before real traffic arrives.
# =============================================================================
APPS=(
  "store:/store/health"
  "auth:/auth/health"
  "admin:/admin/health"
  "playground:/playground/health"
  "landing:/en"
  "payments:/payments/health"
  "studio:/studio/health"
)

log "Waiting for container health endpoints..."
_POLL_START=$(date +%s)
while [ $(( $(date +%s) - _POLL_START )) -lt 120 ]; do
  _HEALTHY_COUNT=0
  for APP_ENTRY in "${APPS[@]}"; do
    APP_HEALTH="${APP_ENTRY#*:}"
    curl -sf --max-time 5 "http://localhost:${HOST_PORT}${APP_HEALTH}" >/dev/null 2>&1 && \
      _HEALTHY_COUNT=$(( _HEALTHY_COUNT + 1 ))
  done
  [ "$_HEALTHY_COUNT" -eq "${#APPS[@]}" ] && break
  sleep 5
done

# --- phase 1: liveness check ---
FAILED=0
HEALTHY=0
for APP_ENTRY in "${APPS[@]}"; do
  APP_NAME="${APP_ENTRY%%:*}"
  APP_HEALTH_PATH="${APP_ENTRY#*:}"

  if curl -sf --max-time 15 "http://localhost:${HOST_PORT}${APP_HEALTH_PATH}" > /dev/null 2>&1; then
    log "  ✓ $APP_NAME — healthy"
    HEALTHY=$(( HEALTHY + 1 ))
  else
    warn "  ✗ $APP_NAME — not responding"
    FAILED=$((FAILED + 1))
  fi
done

if [ "$FAILED" -gt 0 ]; then
  notify_telegram_critical "$(printf '⚠️ <b>Health check: %d/%d apps not responding</b>  •  <code>%s</code>\nDeploy complete with warnings.\n<i>Check: docker logs %s</i>' "$FAILED" "${#APPS[@]}" "$_safe_hostname" "$CONTAINER_NAME")"
  warn "$FAILED app(s) not responding. Skipping warm-up."
  log "Deployment complete (with warnings)."
  exit 0
fi

notify_telegram "$(printf '🏥 <b>All %d apps healthy</b>' "${#APPS[@]}")"

# --- phase 2: JIT warm-up ---
# Hit each app's root + both locale routes 3 times in parallel.
# 3 hits is enough for V8 to promote the hot functions out of interpreter mode.
log "Warming up V8 JIT (3 passes × key routes)..."
_STEP_START=$(date +%s)
_WARM_FAIL_LOG=$(mktemp)

warm_url() {
  local url="$1"
  local ok=0
  for _ in 1 2 3; do
    if curl -sf --max-time 30 "$url" > /dev/null 2>&1; then
      ok=1
      break
    fi
  done
  if [ "$ok" -eq 0 ]; then
    echo "$url" >> "$_WARM_FAIL_LOG"
  fi
}

BASE="http://localhost:${HOST_PORT}"
warm_url "${BASE}/"            &
warm_url "${BASE}/en"          &
warm_url "${BASE}/es"          &
warm_url "${BASE}/store"       &
warm_url "${BASE}/store/en"    &
warm_url "${BASE}/store/es"    &
warm_url "${BASE}/payments"    &
warm_url "${BASE}/payments/en" &
warm_url "${BASE}/payments/es" &
warm_url "${BASE}/auth"        &
warm_url "${BASE}/auth/en"     &
warm_url "${BASE}/admin"       &
warm_url "${BASE}/admin/en"    &
warm_url "${BASE}/studio"      &
warm_url "${BASE}/studio/en"   &
wait

_warm_dur=$(_dur $_STEP_START)
_failed_urls=$(cat "$_WARM_FAIL_LOG" 2>/dev/null || true)
rm -f "$_WARM_FAIL_LOG"

if [ -n "$_failed_urls" ]; then
  _fail_count=$(echo "$_failed_urls" | wc -l | tr -d ' ')
  _fail_list=$(echo "$_failed_urls" | sed "s|${BASE}/||" | tr '\n' ' ' | sed 's/ $//')
  notify_telegram_critical "$(printf '⚠️ <b>JIT warm-up incomplete</b> (%s)\n%s route(s) failed after 3 attempts:\n<code>%s</code>\nFirst visit to these routes may be slow.' "$_warm_dur" "$_fail_count" "$_fail_list")"
  warn "Warm-up incomplete — $_fail_count route(s) unreachable: $_fail_list"
else
  log "Warm-up complete — all routes pre-compiled."
  notify_telegram "$(printf '🔥 <b>JIT warm-up complete</b> (%s)\nAll routes pre-compiled.' "$_warm_dur")"
fi

log "Deployment complete!"
docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
