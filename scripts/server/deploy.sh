#!/bin/bash
set -euo pipefail

# =============================================================================
# Server-side deploy script (called by webhook receiver)
# =============================================================================

DEPLOY_DIR="/home/furrycolombia/candyshop"
REPO_URL="${REPO_URL:-https://github.com/furrycolombia-sys/candyshop.git}"
BRANCH="${BRANCH:-main}"
ENV_FILE="${ENV_FILE:-/home/furrycolombia/candyshop-build.env}"

log()  { echo "[DEPLOY] $1"; }
warn() { echo "[WARN] $1"; }
err()  { echo "[ERROR] $1"; exit 1; }

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 22 --silent || err "Node 22 not available"

log "Node $(node --version) | pnpm $(pnpm --version) | PM2 $(pm2 --version)"

# Pull latest
cd "$DEPLOY_DIR"
git remote set-url origin "$REPO_URL" 2>/dev/null || true
git fetch origin "$BRANCH" --depth 1
git checkout -B "$BRANCH" FETCH_HEAD
git clean -fd
log "Checked out $(git log --oneline -1)"

# Install deps
log "Installing dependencies..."
pnpm install --frozen-lockfile --prod=false

# Load build env
if [ -f "$ENV_FILE" ]; then
  log "Loading build env from $ENV_FILE"
  cp "$ENV_FILE" "$DEPLOY_DIR/.env"
fi
export STANDALONE=true

# Build
log "Building all applications..."
pnpm run build

# Clean env
rm -f "$DEPLOY_DIR/.env"

# Stop all app PM2 processes (keep webhook alive)
log "Restarting applications..."
for entry in $APPS; do
  app=${entry%%:*}
  pm2 delete "candyshop-$app" 2>/dev/null || true
done

# Copy static assets and start standalone servers
APPS="auth:5000 store:5001 admin:5002 playground:5003 landing:5004 payments:5005 studio:5006"
for entry in $APPS; do
  app=${entry%%:*}
  port=${entry##*:}
  STANDALONE_DIR="apps/$app/.next/standalone"

  cp -r "apps/$app/.next/static" "$STANDALONE_DIR/apps/$app/.next/static" 2>/dev/null || true
  cp -r "apps/$app/public" "$STANDALONE_DIR/apps/$app/public" 2>/dev/null || true

  PORT=$port HOSTNAME=0.0.0.0 pm2 start "$STANDALONE_DIR/apps/$app/server.js" --name "candyshop-$app"
  log "Started candyshop-$app on port $port"
done

pm2 save
log "All applications started!"

# Health check
sleep 5
FAILED=0
for entry in $APPS; do
  app=${entry%%:*}
  port=${entry##*:}
  if curl -sf "http://localhost:$port" > /dev/null 2>&1; then
    log "  ✓ $app (port $port)"
  else
    warn "  ✗ $app (port $port) — not responding yet"
    FAILED=$((FAILED + 1))
  fi
done

if [ "$FAILED" -gt 0 ]; then
  warn "$FAILED app(s) not responding yet. Check: pm2 logs"
else
  log "All apps healthy!"
fi

log "Deployment complete!"
