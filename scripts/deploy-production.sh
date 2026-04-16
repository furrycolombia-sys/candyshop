#!/bin/bash
set -euo pipefail

# =============================================================================
# Production Deployment Script for hestia.local
# Runs ON the server via SSH from GitHub Actions
# =============================================================================

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

# =============================================================================
# Clone or pull
# =============================================================================
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
log "Checked out $(git log --oneline -1)"

# =============================================================================
# Install dependencies
# =============================================================================
log "Installing dependencies..."
pnpm install --frozen-lockfile --prod=false

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
log "Building all applications in standalone mode..."
export STANDALONE=true
pnpm run build

# Clean up env file (secrets should not persist on disk)
rm -f "$ENV_FILE" "$DEPLOY_DIR/.env"

# =============================================================================
# Start/restart apps with PM2
# =============================================================================
log "Starting applications with PM2..."

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

  # Copy static assets into standalone directory.
  # Next.js places server.js directly at standalone/server.js when outputFileTracingRoot
  # is not set (each app is its own tracing root).
  STANDALONE_DIR="$DEPLOY_DIR/apps/$APP_NAME/.next/standalone"
  cp -r "$DEPLOY_DIR/apps/$APP_NAME/.next/static" "$STANDALONE_DIR/.next/static" 2>/dev/null || true
  cp -r "$DEPLOY_DIR/apps/$APP_NAME/public" "$STANDALONE_DIR/public" 2>/dev/null || true

  # Start standalone server.js with PM2
  PORT=$APP_PORT HOSTNAME=0.0.0.0 pm2 start "$STANDALONE_DIR/server.js" \
    --name "$PM2_NAME"
done

# Save PM2 process list for auto-restart on reboot
pm2 save

log "All applications started!"
pm2 list

# =============================================================================
# Deploy Nginx config
# =============================================================================
log "Configuring Nginx reverse proxy..."

NGINX_CONF="/home/furrycolombia/candyshop-nginx.conf"
cat > "$NGINX_CONF" << 'NGINX_EOF'
# Candyshop production reverse proxy
# Included by Hestia's nginx config for store.furrycolombia.com

upstream cs_auth    { server 127.0.0.1:5000; }
upstream cs_store   { server 127.0.0.1:5001; }
upstream cs_admin   { server 127.0.0.1:5002; }
upstream cs_play    { server 127.0.0.1:5003; }
upstream cs_landing { server 127.0.0.1:5004; }
upstream cs_pay     { server 127.0.0.1:5005; }
upstream cs_studio  { server 127.0.0.1:5006; }

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
# Health check
# =============================================================================
log "Running health checks..."
sleep 5

FAILED=0
for APP_ENTRY in "${APPS[@]}"; do
  APP_NAME="${APP_ENTRY%%:*}"
  APP_PORT="${APP_ENTRY##*:}"

  if curl -sf "http://localhost:${APP_PORT}" > /dev/null 2>&1; then
    log "  ✓ $APP_NAME (port $APP_PORT) — healthy"
  else
    warn "  ✗ $APP_NAME (port $APP_PORT) — not responding yet"
    FAILED=$((FAILED + 1))
  fi
done

if [ "$FAILED" -gt 0 ]; then
  warn "$FAILED app(s) not responding yet. They may still be starting up."
  warn "Check with: pm2 logs"
else
  log "All apps healthy!"
fi

log "Deployment complete!"
