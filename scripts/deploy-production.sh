#!/bin/bash
set -euo pipefail

# =============================================================================
# Production Deployment Script for hestia.local
# Runs ON the server via SSH from GitHub Actions
# =============================================================================

# ─── Cloudflare Access SSH disconnect guard ───────────────────────────────────
# Building 7 Next.js apps takes 3-4 minutes. The Cloudflare Access WebSocket
# proxy drops idle TCP connections before the build finishes, causing
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

_telegram_send() {
  local thread_id="$1" text="$2"
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] || return 0
  [ -n "${TELEGRAM_CHAT_ID:-}" ] || return 0
  command -v python3 >/dev/null 2>&1 || return 0
  local payload
  payload=$(python3 -c "
import json, sys
d = {'chat_id': sys.argv[1], 'text': sys.argv[2], 'parse_mode': 'HTML'}
if sys.argv[3]:
    d['message_thread_id'] = int(sys.argv[3])
print(json.dumps(d))" "$TELEGRAM_CHAT_ID" "$text" "$thread_id") || return 0
  curl -sf --max-time 10 -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H 'Content-Type: application/json' \
    -d "$payload" >/dev/null 2>&1 || true
}

# Regular channel — deploy steps, recoveries
notify_telegram() {
  _telegram_send "${TELEGRAM_THREAD_ID:-}" "$1"
}

# Critical channel — failures, health warnings, warm-up errors
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
    notify_telegram "$(printf '✅ <b>Deploy complete</b>\nBranch: <code>%s</code>\nCommit: <code>%s</code>\nTotal: %s' \
      "$BRANCH" "$commit" "$dur")"
  else
    notify_telegram_critical "$(printf '❌ <b>Deploy FAILED</b> (exit %s)\nBranch: <code>%s</code>\nCommit: <code>%s</code>\nTotal: %s' \
      "$code" "$BRANCH" "$commit" "$dur")"
  fi
}
trap _on_exit EXIT
# ─────────────────────────────────────────────────────────────────────────────

DEPLOY_DIR="/home/furrycolombia/candyshop"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"

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

log "Node $(node --version) | pnpm $(pnpm --version) | PM2 $(pm2 --version)"
notify_telegram "$(printf '🚀 <b>Deploy started</b>\nBranch: <code>%s</code>' "$BRANCH")"

# =============================================================================
# Clone or pull
# =============================================================================
_STEP_START=$(date +%s)
if [ ! -d "$DEPLOY_DIR/.git" ]; then
  log "First deploy — cloning repository..."
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$DEPLOY_DIR"
else
  log "Pulling latest from $BRANCH..."
  cd "$DEPLOY_DIR"
  git remote set-url origin "$REPO_URL" 2>/dev/null || true
  git fetch origin "$BRANCH" --depth 1
  git checkout -B "$BRANCH" "FETCH_HEAD"
  git clean -fd
fi

cd "$DEPLOY_DIR"
DEPLOY_COMMIT=$(git log --format="%h %s" -1 2>/dev/null || true)
log "Checked out $DEPLOY_COMMIT"
notify_telegram "$(printf '📥 <b>Code pulled</b> (%s)\nCommit: <code>%s</code>' "$(_dur $_STEP_START)" "$DEPLOY_COMMIT")"

# =============================================================================
# Install dependencies
# =============================================================================
_STEP_START=$(date +%s)
log "Installing dependencies..."
pnpm install --frozen-lockfile --prod=false
notify_telegram "$(printf '📦 <b>Dependencies installed</b> (%s)' "$(_dur $_STEP_START)")"

# =============================================================================
# Load build env vars (written by CI, deleted after deploy)
# =============================================================================
ENV_FILE="${ENV_FILE:-/tmp/.candyshop-build.env}"
if [ -f "$ENV_FILE" ]; then
  log "Loading build env from $ENV_FILE"
  cp "$ENV_FILE" "$DEPLOY_DIR/.env"
  # Source env vars into the current shell so child processes (pnpm build) inherit them.
  # This is required for load-env.mjs to detect CI=true and resolve $secret: references.
  set -o allexport
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +o allexport
else
  warn "No env file found at $ENV_FILE — building with defaults"
fi

# =============================================================================
# Build all apps (standalone mode for path-based routing)
# =============================================================================
_STEP_START=$(date +%s)
log "Building all applications in standalone mode..."
export STANDALONE=true

# Clear the local Turborepo cache to ensure a fresh standalone build.
# Without this, a prior non-standalone cache hit would restore output that
# lacks the .next/standalone directory.
rm -rf "$DEPLOY_DIR/.turbo"

notify_telegram "$(printf '🔨 <b>Building all apps…</b>\n<i>Takes ~3–4 min</i>')"
pnpm run build

# Clean up env file (secrets should not persist on disk)
rm -f "$ENV_FILE" "$DEPLOY_DIR/.env"
notify_telegram "$(printf '✅ <b>Build complete</b> (%s)' "$(_dur $_STEP_START)")"

# =============================================================================
# Start/restart apps with PM2
# =============================================================================
log "Starting applications with PM2..."
_STEP_START=$(date +%s)

APPS=(
  "auth:5000"
  "store:5001"
  "admin:5002"
  "playground:5003"
  "landing:5004"
  "payments:5005"
  "studio:5006"
)

for APP_ENTRY in "${APPS[@]}"; do
  APP_NAME="${APP_ENTRY%%:*}"
  APP_PORT="${APP_ENTRY##*:}"
  PM2_NAME="candyshop-${APP_NAME}"

  log "Starting $PM2_NAME on port $APP_PORT..."

  # Stop existing instance if running
  pm2 delete "$PM2_NAME" 2>/dev/null || true

  STANDALONE_DIR="$DEPLOY_DIR/apps/$APP_NAME/.next/standalone"

  # Locate server.js — Next.js places it at standalone/server.js when
  # outputFileTracingRoot is the app root, or standalone/apps/<name>/server.js
  # when outputFileTracingRoot is the monorepo root (auto-detected in monorepos).
  SERVER_JS=$(find "$STANDALONE_DIR" -name "server.js" -maxdepth 4 2>/dev/null | head -1)
  if [ -z "$SERVER_JS" ]; then
    err "Cannot find server.js for $APP_NAME in $STANDALONE_DIR"
  fi
  SERVER_DIR=$(dirname "$SERVER_JS")
  log "server.js found at: $SERVER_JS"

  # Copy static assets into the directory that server.js lives in
  cp -r "$DEPLOY_DIR/apps/$APP_NAME/.next/static" "$SERVER_DIR/.next/static" 2>/dev/null || true
  cp -r "$DEPLOY_DIR/apps/$APP_NAME/public" "$SERVER_DIR/public" 2>/dev/null || true

  # Start standalone server.js with PM2
  PORT=$APP_PORT HOSTNAME=0.0.0.0 pm2 start "$SERVER_JS" \
    --name "$PM2_NAME"
done

log "Starting health watcher..."
pm2 delete candyshop-watcher 2>/dev/null || true
pm2 start "$DEPLOY_DIR/docker/watcher.mjs" \
  --name candyshop-watcher \
  --env "TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-},TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-},TELEGRAM_THREAD_ID=${TELEGRAM_THREAD_ID:-}"

# Save PM2 process list for auto-restart on reboot
pm2 save

log "All applications started!"
pm2 list
notify_telegram "$(printf '🔄 <b>%d apps restarted with PM2</b> (%s)' "${#APPS[@]}" "$(_dur $_STEP_START)")"

# =============================================================================
# Deploy Nginx config
# =============================================================================
log "Configuring Nginx reverse proxy..."

NGINX_CONF="/home/furrycolombia/candyshop-nginx.conf"
cat > "$NGINX_CONF" << 'NGINX_EOF'
# Candyshop production reverse proxy
# Included by Hestia's nginx config for store.furrycolombia.com

upstream cs_auth    { server 127.0.0.1:5000; keepalive 16; }
upstream cs_store   { server 127.0.0.1:5001; keepalive 16; }
upstream cs_admin   { server 127.0.0.1:5002; keepalive 16; }
upstream cs_play    { server 127.0.0.1:5003; keepalive 16; }
upstream cs_landing { server 127.0.0.1:5004; keepalive 16; }
upstream cs_pay     { server 127.0.0.1:5005; keepalive 16; }
upstream cs_studio  { server 127.0.0.1:5006; keepalive 16; }

map $http_upgrade $allowed_upgrade {
    default "";
    "websocket" "websocket";
}
map $http_upgrade $connection_upgrade {
    default "";
    "websocket" "upgrade";
}

server {
    listen 9090;
    server_name _;

    proxy_buffer_size          16k;
    proxy_buffers              8 16k;
    proxy_busy_buffers_size    32k;
    large_client_header_buffers 8 32k;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    location /store   { proxy_pass http://cs_store;   include /home/furrycolombia/candyshop-proxy.inc; }
    location /admin   { proxy_pass http://cs_admin;   include /home/furrycolombia/candyshop-proxy.inc; }
    location /auth    { proxy_pass http://cs_auth;    include /home/furrycolombia/candyshop-proxy.inc; }
    location /payments { proxy_pass http://cs_pay;    include /home/furrycolombia/candyshop-proxy.inc; }
    location /playground { proxy_pass http://cs_play; include /home/furrycolombia/candyshop-proxy.inc; }
    location /studio  { proxy_pass http://cs_studio;  include /home/furrycolombia/candyshop-proxy.inc; }
    location /        { proxy_pass http://cs_landing; include /home/furrycolombia/candyshop-proxy.inc; }

    location = /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
NGINX_EOF

# Shared proxy headers snippet
cat > /home/furrycolombia/candyshop-proxy.inc << 'PROXY_EOF'
proxy_http_version 1.1;
proxy_set_header Upgrade $allowed_upgrade;
proxy_set_header Connection $connection_upgrade;
proxy_set_header Host $http_host;
proxy_set_header X-Forwarded-Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_cache_bypass $http_upgrade;
PROXY_EOF

log "Nginx config written to $NGINX_CONF"
log "NOTE: Hestia domain config for store.furrycolombia.com must proxy to port 9090"

# =============================================================================
# Health check + warm-up
# After PM2 starts, V8 is cold — the first real user request would pay a
# compilation penalty on every route. We hit each app's key localized pages
# 3 times so V8 JIT-compiles the hot paths before real traffic arrives.
# =============================================================================
log "Waiting for all apps to accept connections..."
sleep 10

# --- phase 1: liveness check ---
FAILED=0
HEALTHY=0
for APP_ENTRY in "${APPS[@]}"; do
  APP_NAME="${APP_ENTRY%%:*}"
  APP_PORT="${APP_ENTRY##*:}"

  if curl -sf --max-time 15 "http://localhost:${APP_PORT}" > /dev/null 2>&1; then
    log "  ✓ $APP_NAME (port $APP_PORT) — accepting connections"
    HEALTHY=$(( HEALTHY + 1 ))
  else
    warn "  ✗ $APP_NAME (port $APP_PORT) — not responding (check: pm2 logs $APP_NAME)"
    FAILED=$((FAILED + 1))
  fi
done

if [ "$FAILED" -gt 0 ]; then
  notify_telegram_critical "$(printf '⚠️ <b>Health check: %d/%d apps not responding</b>\nDeploy complete with warnings.\n<i>Check: pm2 logs</i>' "$FAILED" "${#APPS[@]}")"
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

warm_url "http://localhost:5004/"         &  # landing root
warm_url "http://localhost:5004/en"       &
warm_url "http://localhost:5004/es"       &

warm_url "http://localhost:5001/store"    &  # store
warm_url "http://localhost:5001/store/en" &
warm_url "http://localhost:5001/store/es" &

warm_url "http://localhost:5005/payments"    &  # payments
warm_url "http://localhost:5005/payments/en" &
warm_url "http://localhost:5005/payments/es" &

warm_url "http://localhost:5000/auth"    &  # auth
warm_url "http://localhost:5000/auth/en" &

warm_url "http://localhost:5002/admin"    &  # admin
warm_url "http://localhost:5002/admin/en" &

warm_url "http://localhost:5006/studio"    &  # studio
warm_url "http://localhost:5006/studio/en" &

wait
_warm_dur=$(_dur $_STEP_START)
_failed_urls=$(cat "$_WARM_FAIL_LOG" 2>/dev/null || true)
rm -f "$_WARM_FAIL_LOG"

if [ -n "$_failed_urls" ]; then
  _fail_count=$(echo "$_failed_urls" | wc -l | tr -d ' ')
  _fail_list=$(echo "$_failed_urls" | sed 's|http://localhost:[0-9]*/||' | tr '\n' ' ' | sed 's/ $//')
  notify_telegram_critical "$(printf '⚠️ <b>JIT warm-up incomplete</b> (%s)\n%s route(s) failed after 3 attempts:\n<code>%s</code>\nFirst visit to these routes may be slow.' "$_warm_dur" "$_fail_count" "$_fail_list")"
  warn "Warm-up incomplete — $_fail_count route(s) unreachable: $_fail_list"
else
  log "Warm-up complete — all routes pre-compiled."
  notify_telegram "$(printf '🔥 <b>JIT warm-up complete</b> (%s)\nAll routes pre-compiled.' "$_warm_dur")"
fi

log "Deployment complete!"
