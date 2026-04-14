# Infrastructure & Deployment Guide

> Everything needed to reproduce the production environment from scratch — whether migrating servers, recovering from failure, or moving to cloud.

## Architecture Overview

```
GitHub (push to main)
  │
  └─ Webhook POST ──► deploy.furrycolombia.com
                          │
                          ▼
                    Webhook receiver (PM2, port 9091)
                          │
                          ▼
                    Docker build --no-cache
                          │
                          ▼
                    candyshop-prod container (port 9090)
                      ├─ Nginx :80 (inside container)
                      │   ├─ /          → landing  :5004
                      │   ├─ /store     → store    :5001
                      │   ├─ /admin     → admin    :5002
                      │   ├─ /auth      → auth     :5000
                      │   ├─ /payments  → payments :5005
                      │   ├─ /playground→ playground:5003
                      │   └─ /studio    → studio   :5006
                      └─ supervisord (7 Next.js standalone servers)
                          │
                          ▼
                    Cloudflare Tunnel → store.furrycolombia.com (SSL)
```

## Development Environments

Three environments with clear separation: dev (local Vite), staging (local Docker), and prod (remote server).

| Environment      | Command               | Description                                           |
| ---------------- | --------------------- | ----------------------------------------------------- |
| Dev              | `pnpm dev`            | Vite dev servers on ports 5000–5006                   |
| Dev + Supabase   | `pnpm dev:up`         | Dev servers + local Supabase start                    |
| Dev + Tunnel     | `pnpm dev:up:tunnel`  | Dev + Supabase + Cloudflare tunnel to ffxivbe.org     |
| Staging          | `pnpm staging`        | Docker container on port 8088                         |
| Staging (fresh)  | `pnpm staging:fresh`  | Rebuild Docker from scratch (no cache)                |
| Staging + Tunnel | `pnpm staging:tunnel` | Docker + Cloudflare sidecar in compose                |
| Staging Public   | `pnpm staging:public` | Docker + named Cloudflare tunnel to store.ffxivbe.org |
| Staging Stop     | `pnpm staging:stop`   | Stop staging Docker container                         |
| Prod Deploy      | `pnpm prod:deploy`    | SSH deploy to production server via deploy.sh         |
| Prod Logs        | `pnpm prod:logs`      | Tail production Docker logs (candyshop-prod)          |
| Prod Status      | `pnpm prod:status`    | Check production container status                     |

Environment files:

- `.env.example` — committed defaults for local dev
- `.env` — local overrides (gitignored), secrets and OAuth keys
- `.env.staging` — committed staging overrides (container name, public URLs)
- `.env.e2e` — committed E2E test overrides (isolated Supabase, port 8089)
- `.env.prod` — committed prod E2E overrides (points at live site + Supabase Cloud)

## Server

| Property      | Value                               |
| ------------- | ----------------------------------- |
| Hostname      | hestia.local                        |
| LAN IP        | 192.168.2.71                        |
| Public IP     | 186.29.35.212 (dynamic, behind NAT) |
| OS            | Ubuntu 24.04 (Linux 6.8)            |
| RAM           | 8 GB                                |
| Disk          | 915 GB                              |
| Control Panel | Hestia CP (port 8083)               |
| SSH user      | furrycolombia                       |
| SSH auth      | ED25519 key (`candystore-deploy`)   |
| SSH password  | Same as sudo password               |

## Software on Server

| Tool           | Version  | Install method       |
| -------------- | -------- | -------------------- |
| Node.js        | 22.x     | nvm (`~/.nvm`)       |
| pnpm           | 10.x     | npm global (via nvm) |
| PM2            | 6.x      | npm global (via nvm) |
| Docker         | 29.x     | `get.docker.com`     |
| Docker Compose | 5.x      | Bundled with Docker  |
| Nginx          | 1.29.x   | System (Hestia)      |
| cloudflared    | 2026.3.x | Cloudflare apt repo  |
| Git            | 2.43     | System               |

## Domain & Networking

| Domain                   | Routes to                 | Purpose                         |
| ------------------------ | ------------------------- | ------------------------------- |
| store.furrycolombia.com  | Cloudflare tunnel → :9090 | Production app                  |
| deploy.furrycolombia.com | Cloudflare tunnel → :9091 | Webhook deploy receiver         |
| ssh.furrycolombia.com    | Cloudflare tunnel → :22   | SSH access (for GitHub Actions) |

**⚠️ Only these 3 subdomains belong to this project. `furrycolombia.com` and `moonfest.furrycolombia.com` are separate sites. Never modify their DNS records.**

## Cloudflare Tunnel

| Property    | Value                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| Tunnel name | candyshop-prod                                                                 |
| Tunnel ID   | af85209b-fcfb-477a-9b95-81180f6901f2                                           |
| Service     | systemd (`cloudflared.service`), auto-starts on boot                           |
| Config      | `/etc/cloudflared/config.yml`                                                  |
| Credentials | `/etc/cloudflared/af85209b-fcfb-477a-9b95-81180f6901f2.json`                   |
| Cert        | `/home/furrycolombia/.cloudflared/cert.pem` (authorized for furrycolombia.com) |

Current ingress rules:

```yaml
ingress:
  - hostname: deploy.furrycolombia.com
    service: http://127.0.0.1:9091
  - hostname: ssh.furrycolombia.com
    service: ssh://localhost:22
  - hostname: store.furrycolombia.com
    service: http://127.0.0.1:9090
  - service: http_status:404
```

## Docker Production Container

| Property       | Value                                                     |
| -------------- | --------------------------------------------------------- |
| Container name | candyshop-prod                                            |
| Image          | candyshop-prod:latest                                     |
| Port mapping   | 9090:80                                                   |
| Compose file   | `docker/compose.yml`                                      |
| Env file       | `/home/furrycolombia/.env.prod` (outside repo, chmod 600) |
| Restart policy | unless-stopped                                            |

The container runs Nginx + supervisord with 7 standalone Next.js servers inside. This is the same image used for local Docker E2E tests.

### Production env file (`/home/furrycolombia/.env.prod`)

```env
SITE_PROD_CONTAINER_NAME=candyshop-prod
SITE_PROD_IMAGE_NAME=candyshop-prod
SITE_PROD_PORT=9090
SITE_PUBLIC_ORIGIN=https://store.furrycolombia.com
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
AUTH_PROVIDER_MODE=supabase
NEXT_PUBLIC_STORE_URL=https://store.furrycolombia.com/store
NEXT_PUBLIC_ADMIN_URL=https://store.furrycolombia.com/admin
NEXT_PUBLIC_AUTH_HOST_URL=https://store.furrycolombia.com/auth
NEXT_PUBLIC_AUTH_URL=https://store.furrycolombia.com/auth
NEXT_PUBLIC_LANDING_URL=https://store.furrycolombia.com
NEXT_PUBLIC_PAYMENTS_URL=https://store.furrycolombia.com/payments
NEXT_PUBLIC_STUDIO_URL=https://store.furrycolombia.com/studio
NEXT_PUBLIC_PLAYGROUND_URL=https://store.furrycolombia.com/playground
NEXT_PUBLIC_API_PREFIX=/api
NEXT_PUBLIC_ENABLE_MOCKS=false
```

A template is committed at `scripts/server/docker-prod.env.example`.

## Webhook Deploy Receiver

| Property      | Value                                       |
| ------------- | ------------------------------------------- |
| URL           | `https://deploy.furrycolombia.com/deploy`   |
| Health        | `https://deploy.furrycolombia.com/health`   |
| Port          | 9091                                        |
| PM2 name      | candyshop-webhook                           |
| Script        | `/home/furrycolombia/webhook-deploy.mjs`    |
| Deploy script | `/home/furrycolombia/deploy.sh`             |
| Secret        | Stored in GitHub webhook settings + PM2 env |
| Trigger       | Push to `main` branch                       |

When you push to `main`, GitHub sends a POST to the webhook. The receiver verifies the HMAC signature, pulls latest code, rebuilds the Docker container with `--no-cache`, and restarts it.

## Supabase (Cloud)

| Property  | Value                                                         |
| --------- | ------------------------------------------------------------- |
| Provider  | Supabase Cloud (free tier)                                    |
| Project   | candyshop-prod                                                |
| Ref       | olafyajipvsltohagiah                                          |
| Region    | South America (São Paulo)                                     |
| URL       | `https://olafyajipvsltohagiah.supabase.co`                    |
| Dashboard | `https://supabase.com/dashboard/project/olafyajipvsltohagiah` |
| RLS       | Enabled (automatic)                                           |
| Site URL  | `https://store.furrycolombia.com`                             |

### Auth redirect URLs (configured in Supabase dashboard)

- `https://store.furrycolombia.com/auth/callback`
- `https://store.furrycolombia.com/store/auth/callback`

### OAuth providers (configured in Supabase dashboard, not via code)

| Provider | Status         | Redirect URI                                                |
| -------- | -------------- | ----------------------------------------------------------- |
| Google   | Enabled        | `https://olafyajipvsltohagiah.supabase.co/auth/v1/callback` |
| Discord  | Not configured | —                                                           |

Google credentials are also registered in Google Cloud Console with the Supabase callback as an authorized redirect URI.

## GitHub Secrets

| Secret                          | Value                                        |
| ------------------------------- | -------------------------------------------- |
| `PROD_SERVER_HOST`              | `ssh.furrycolombia.com`                      |
| `PROD_SERVER_USER`              | `furrycolombia`                              |
| `PROD_SERVER_SSH_KEY`           | ED25519 private key (full PEM)               |
| `WEBHOOK_SECRET`                | HMAC secret shared with GitHub webhook       |
| `NEXT_PUBLIC_STORE_URL`         | `https://store.furrycolombia.com/store`      |
| `NEXT_PUBLIC_ADMIN_URL`         | `https://store.furrycolombia.com/admin`      |
| `NEXT_PUBLIC_AUTH_HOST_URL`     | `https://store.furrycolombia.com/auth`       |
| `NEXT_PUBLIC_AUTH_URL`          | `https://store.furrycolombia.com/auth`       |
| `NEXT_PUBLIC_LANDING_URL`       | `https://store.furrycolombia.com`            |
| `NEXT_PUBLIC_PAYMENTS_URL`      | `https://store.furrycolombia.com/payments`   |
| `NEXT_PUBLIC_STUDIO_URL`        | `https://store.furrycolombia.com/studio`     |
| `NEXT_PUBLIC_PLAYGROUND_URL`    | `https://store.furrycolombia.com/playground` |
| `NEXT_PUBLIC_API_PREFIX`        | `/api`                                       |
| `NEXT_PUBLIC_ENABLE_MOCKS`      | `false`                                      |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://olafyajipvsltohagiah.supabase.co`   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key                            |

## GitHub Webhook

| Property         | Value                                     |
| ---------------- | ----------------------------------------- |
| Payload URL      | `https://deploy.furrycolombia.com/deploy` |
| Content type     | application/json                          |
| Secret           | Same as `WEBHOOK_SECRET`                  |
| SSL verification | Enabled                                   |
| Events           | Just the push event                       |
| Active           | Yes                                       |

## Hestia CP

| Property   | Value                                                       |
| ---------- | ----------------------------------------------------------- |
| Admin URL  | `https://server.furrycolombia.com:8083`                     |
| Admin user | useradmin                                                   |
| Domain     | store.furrycolombia.com (custom `candyshop` nginx template) |
| Template   | Proxies to `127.0.0.1:9090` (Docker container)              |

## File Locations on Server

| Path                                       | Purpose                                              |
| ------------------------------------------ | ---------------------------------------------------- |
| `/home/furrycolombia/candyshop/`           | Git repo clone                                       |
| `/home/furrycolombia/.env.prod`            | Docker env file (secrets, chmod 600)                 |
| `/home/furrycolombia/deploy.sh`            | Deploy script (called by webhook)                    |
| `/home/furrycolombia/webhook-deploy.mjs`   | Webhook receiver                                     |
| `/home/furrycolombia/candyshop-nginx.conf` | Standalone nginx config (unused, Docker has its own) |
| `/home/furrycolombia/candyshop-proxy.inc`  | Nginx proxy headers (unused, Docker has its own)     |
| `/etc/cloudflared/config.yml`              | Cloudflare tunnel config                             |
| `/etc/cloudflared/af85209b-*.json`         | Tunnel credentials                                   |

## PM2 Processes

| Name              | Script                                   | Purpose                 |
| ----------------- | ---------------------------------------- | ----------------------- |
| candyshop-webhook | `/home/furrycolombia/webhook-deploy.mjs` | GitHub webhook receiver |

The 7 Next.js apps run inside the Docker container (managed by supervisord), not PM2.

---

## Fresh Server Setup (Migration Runbook)

### 1. OS & user

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl
sudo adduser furrycolombia
sudo usermod -aG sudo furrycolombia
```

### 2. SSH key auth

From your local machine:

```bash
ssh-keygen -t ed25519 -C "candystore-deploy"
type %USERPROFILE%\.ssh\id_ed25519.pub | ssh furrycolombia@<SERVER_IP> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
```

### 3. Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker furrycolombia
# Log out and back in for group to take effect
```

### 4. Node.js + nvm + PM2

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22
npm install -g pnpm pm2
pm2 startup  # Run the sudo command it outputs
```

### 5. Cloudflare tunnel

```bash
# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o /tmp/cloudflare-main.gpg
sudo cp /tmp/cloudflare-main.gpg /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install -y cloudflared

# Login (opens browser — select furrycolombia.com)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create candyshop-prod

# Route DNS (ONLY these 3 subdomains)
cloudflared tunnel route dns candyshop-prod store.furrycolombia.com
cloudflared tunnel route dns candyshop-prod deploy.furrycolombia.com
cloudflared tunnel route dns candyshop-prod ssh.furrycolombia.com

# Write config (replace <TUNNEL_ID>)
sudo mkdir -p /etc/cloudflared
sudo tee /etc/cloudflared/config.yml << EOF
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/<TUNNEL_ID>.json
protocol: http2

ingress:
  - hostname: deploy.furrycolombia.com
    service: http://127.0.0.1:9091
  - hostname: ssh.furrycolombia.com
    service: ssh://localhost:22
  - hostname: store.furrycolombia.com
    service: http://127.0.0.1:9090
  - service: http_status:404
EOF

sudo cp ~/.cloudflared/<TUNNEL_ID>.json /etc/cloudflared/
sudo cloudflared service install
```

**⚠️ Only `store`, `deploy`, and `ssh` subdomains. Never touch `furrycolombia.com` or `moonfest.furrycolombia.com`.**

### 6. Clone repo and create env file

```bash
git clone --branch main --depth 1 https://github.com/furrycolombia-sys/candyshop.git ~/candyshop

# Create env file OUTSIDE the repo (won't be wiped by git clean)
cat > ~/.env.prod << 'EOF'
SITE_PROD_CONTAINER_NAME=candyshop-prod
SITE_PROD_IMAGE_NAME=candyshop-prod
SITE_PROD_PORT=9090
SITE_PUBLIC_ORIGIN=https://store.furrycolombia.com
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
AUTH_PROVIDER_MODE=supabase
NEXT_PUBLIC_STORE_URL=https://store.furrycolombia.com/store
NEXT_PUBLIC_ADMIN_URL=https://store.furrycolombia.com/admin
NEXT_PUBLIC_AUTH_HOST_URL=https://store.furrycolombia.com/auth
NEXT_PUBLIC_AUTH_URL=https://store.furrycolombia.com/auth
NEXT_PUBLIC_LANDING_URL=https://store.furrycolombia.com
NEXT_PUBLIC_PAYMENTS_URL=https://store.furrycolombia.com/payments
NEXT_PUBLIC_STUDIO_URL=https://store.furrycolombia.com/studio
NEXT_PUBLIC_PLAYGROUND_URL=https://store.furrycolombia.com/playground
NEXT_PUBLIC_API_PREFIX=/api
NEXT_PUBLIC_ENABLE_MOCKS=false
EOF
chmod 600 ~/.env.prod
```

### 7. Build and start the container

```bash
cd ~/candyshop
docker compose -f docker/compose.yml --env-file ~/.env.prod build --no-cache
docker compose -f docker/compose.yml --env-file ~/.env.prod up -d
```

### 8. Deploy webhook receiver

```bash
# Upload webhook-deploy.mjs and deploy.sh to ~/
# Then start with PM2:
WEBHOOK_SECRET=<secret> DEPLOY_SCRIPT=/home/furrycolombia/deploy.sh \
  pm2 start ~/webhook-deploy.mjs --name candyshop-webhook
pm2 save
```

### 9. GitHub webhook

In repo Settings → Webhooks → Add webhook:

- Payload URL: `https://deploy.furrycolombia.com/deploy`
- Content type: `application/json`
- Secret: same as `WEBHOOK_SECRET`
- Events: Just the push event
- SSL verification: enabled

### 10. GitHub secrets

```bash
gh secret set PROD_SERVER_HOST --body "ssh.furrycolombia.com"
gh secret set PROD_SERVER_USER --body "furrycolombia"
gh secret set PROD_SERVER_SSH_KEY < ~/.ssh/id_ed25519
# ... all NEXT_PUBLIC_* secrets (see table above)
```

---

## Operational Commands

### Docker

```bash
# View running container
docker ps

# View logs
docker logs candyshop-prod -f

# Restart
docker compose -f ~/candyshop/docker/compose.yml --env-file ~/.env.prod restart

# Rebuild and restart (no cache)
docker compose -f ~/candyshop/docker/compose.yml --env-file ~/.env.prod up -d --build --no-cache

# Stop
docker compose -f ~/candyshop/docker/compose.yml --env-file ~/.env.prod down
```

### Webhook

```bash
pm2 logs candyshop-webhook
pm2 restart candyshop-webhook
curl https://deploy.furrycolombia.com/health
```

### Cloudflare tunnel

```bash
sudo systemctl status cloudflared
sudo systemctl restart cloudflared
sudo journalctl -u cloudflared -f
```

### Manual deploy

```bash
ssh furrycolombia@192.168.2.71
bash ~/deploy.sh
```

---

## E2E Against Production

To run E2E tests against the live site (with test IDs enabled):

1. Rebuild with test IDs:

```bash
# Add to .env.prod temporarily
echo "NEXT_PUBLIC_ENABLE_TEST_IDS=true" >> ~/.env.prod
docker compose -f ~/candyshop/docker/compose.yml --env-file ~/.env.prod up -d --build
```

2. Run tests locally:

```bash
E2E_PUBLIC_ORIGIN=https://store.furrycolombia.com \
PLAYWRIGHT_USE_EXISTING_STACK=true \
NEXT_PUBLIC_SUPABASE_URL=https://olafyajipvsltohagiah.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
pnpm --filter store exec playwright test --reporter=list
```

3. Remove test IDs after:

```bash
sed -i '/ENABLE_TEST_IDS/d' ~/.env.prod
docker compose -f ~/candyshop/docker/compose.yml --env-file ~/.env.prod up -d --build --no-cache
```

Production deploys via webhook never include test IDs.

---

## Troubleshooting

| Symptom                    | Check                                                      |
| -------------------------- | ---------------------------------------------------------- |
| Site down                  | `docker ps` — is the container running?                    |
| 502 from Cloudflare        | `curl localhost:9090/health` on the server                 |
| Container crash loop       | `docker logs candyshop-prod --tail 50`                     |
| Webhook not triggering     | `pm2 logs candyshop-webhook`                               |
| Tunnel down                | `sudo systemctl status cloudflared`                        |
| Can't SSH                  | Check cloudflared is running + `ssh.furrycolombia.com` DNS |
| Build fails                | Check Docker disk space: `df -h` and `docker system prune` |
| Auth redirect to localhost | Check Supabase Site URL setting in dashboard               |
| OAuth provider error       | Check provider is enabled in Supabase dashboard            |
