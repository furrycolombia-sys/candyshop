# Infrastructure & Deployment Guide

> Everything needed to reproduce the production environment from scratch — whether migrating servers, recovering from failure, or moving to cloud.

## Architecture Overview

```
GitHub (main branch)
  │
  ├─ CI Gate (lint, typecheck, test, build)
  │
  └─ Deploy via SSH ──► hestia.local (192.168.2.71)
                            │
                            ├─ Nginx (port 9090) ── reverse proxy
                            │   ├─ /          → landing  :5004
                            │   ├─ /store     → store    :5001
                            │   ├─ /admin     → admin    :5002
                            │   ├─ /auth      → auth     :5000
                            │   ├─ /payments  → payments :5005
                            │   ├─ /playground→ playground:5003
                            │   └─ /studio    → studio   :5006
                            │
                            ├─ PM2 (process manager, 7 Next.js apps)
                            │
                            └─ Hestia CP (port 8083)
                                ├─ store.furrycolombia.com → proxy to :9090
                                └─ SSL via Let's Encrypt
```

All apps are served under a single domain: `https://store.furrycolombia.com`

## Server Specs

| Property      | Value                             |
| ------------- | --------------------------------- |
| Hostname      | hestia.local                      |
| LAN IP        | 192.168.2.71                      |
| OS            | Ubuntu 24.04 (Linux 6.8)          |
| RAM           | 8 GB                              |
| Disk          | 915 GB (SSD)                      |
| Control Panel | Hestia CP                         |
| SSH User      | furrycolombia                     |
| SSH Auth      | ED25519 key (`candystore-deploy`) |

## Software Stack (on server)

| Tool    | Version | Install method             |
| ------- | ------- | -------------------------- |
| Node.js | 22.x    | nvm (userspace)            |
| pnpm    | 10.x    | npm global (via nvm)       |
| PM2     | 6.x     | npm global (via nvm)       |
| Nginx   | 1.29.x  | System (managed by Hestia) |
| Git     | 2.43    | System                     |

## Port Map

| App        | Port | Path        | PM2 Name             |
| ---------- | ---- | ----------- | -------------------- |
| auth       | 5000 | /auth       | candyshop-auth       |
| store      | 5001 | /store      | candyshop-store      |
| admin      | 5002 | /admin      | candyshop-admin      |
| playground | 5003 | /playground | candyshop-playground |
| landing    | 5004 | / (root)    | candyshop-landing    |
| payments   | 5005 | /payments   | candyshop-payments   |
| studio     | 5006 | /studio     | candyshop-studio     |

## CI/CD Pipeline

### Trigger

Push to `main` branch (paths: `apps/**`, `packages/**`, `package.json`, `pnpm-lock.yaml`)
Also available via manual `workflow_dispatch`.

### Workflow: `.github/workflows/deploy-production.yml`

1. **CI Gate** — typecheck, lint, unit tests, build (with `STANDALONE=true`)
2. **Deploy** — SSH into server, run `scripts/deploy-production.sh`
   - Pulls latest code
   - `pnpm install --frozen-lockfile`
   - Builds all apps with `STANDALONE=true` (enables path-based routing)
   - Restarts all PM2 processes
   - Runs health checks

### GitHub Secrets Required

| Secret                          | Description                    | Example                                      |
| ------------------------------- | ------------------------------ | -------------------------------------------- |
| `PROD_SERVER_HOST`              | Server IP                      | `192.168.2.71`                               |
| `PROD_SERVER_USER`              | SSH username                   | `furrycolombia`                              |
| `PROD_SERVER_SSH_KEY`           | ED25519 private key (full PEM) | `-----BEGIN OPENSSH...`                      |
| `NEXT_PUBLIC_STORE_URL`         | Store app URL                  | `https://store.furrycolombia.com/store`      |
| `NEXT_PUBLIC_ADMIN_URL`         | Admin app URL                  | `https://store.furrycolombia.com/admin`      |
| `NEXT_PUBLIC_AUTH_HOST_URL`     | Auth app URL                   | `https://store.furrycolombia.com/auth`       |
| `NEXT_PUBLIC_AUTH_URL`          | Auth app URL (alias)           | `https://store.furrycolombia.com/auth`       |
| `NEXT_PUBLIC_LANDING_URL`       | Landing app URL                | `https://store.furrycolombia.com`            |
| `NEXT_PUBLIC_PAYMENTS_URL`      | Payments app URL               | `https://store.furrycolombia.com/payments`   |
| `NEXT_PUBLIC_STUDIO_URL`        | Studio app URL                 | `https://store.furrycolombia.com/studio`     |
| `NEXT_PUBLIC_PLAYGROUND_URL`    | Playground app URL             | `https://store.furrycolombia.com/playground` |
| `NEXT_PUBLIC_API_PREFIX`        | API route prefix               | `/api`                                       |
| `NEXT_PUBLIC_API_BASE_URL`      | API base URL                   | (empty for same-origin)                      |
| `NEXT_PUBLIC_ENABLE_MOCKS`      | Disable mocks in prod          | `false`                                      |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL           | `https://xxx.supabase.co`                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key              | `eyJ...`                                     |

---

## Fresh Server Setup (Migration Runbook)

Follow these steps to reproduce the environment on a new server.

### 1. OS & Prerequisites

```bash
# Ubuntu 22.04+ recommended
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx
```

### 2. Create deploy user

```bash
sudo adduser furrycolombia
sudo usermod -aG sudo furrycolombia
```

### 3. SSH Key Auth

From your local machine:

```bash
# Generate key (if you don't have one)
ssh-keygen -t ed25519 -C "candystore-deploy"

# Copy public key to server
type %USERPROFILE%\.ssh\id_ed25519.pub | ssh furrycolombia@<SERVER_IP> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
```

### 4. Install Node.js via nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22
```

### 5. Install pnpm & PM2

```bash
npm install -g pnpm pm2
```

### 6. Configure PM2 auto-startup

```bash
pm2 startup
# Copy and run the sudo command it outputs, e.g.:
# sudo env PATH=$PATH:/home/furrycolombia/.nvm/versions/node/v22.22.2/bin \
#   /home/furrycolombia/.nvm/versions/node/v22.22.2/lib/node_modules/pm2/bin/pm2 \
#   startup systemd -u furrycolombia --hp /home/furrycolombia
```

### 7. Deploy the application

```bash
# Clone the repo
git clone --branch main --depth 1 https://github.com/furrycolombia-sys/candyshop.git /home/furrycolombia/candyshop

cd /home/furrycolombia/candyshop

# Install deps
pnpm install --frozen-lockfile --prod=false

# Write production .env (deleted after build)
cat > .env << EOF
STANDALONE=true
BASE_PATH_PREFIX=
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
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

# Build in standalone mode
STANDALONE=true pnpm run build

# Delete .env (secrets must not persist)
rm .env

# Copy static assets into standalone dirs + start with PM2
for app in auth store admin playground landing payments studio; do
  STANDALONE_DIR="apps/$app/.next/standalone"
  cp -r "apps/$app/.next/static" "$STANDALONE_DIR/apps/$app/.next/static"
  cp -r "apps/$app/public" "$STANDALONE_DIR/apps/$app/public" 2>/dev/null || true
done

# Start all apps (standalone server.js, NOT pnpm start)
PORT=5000 HOSTNAME=0.0.0.0 pm2 start apps/auth/.next/standalone/apps/auth/server.js --name candyshop-auth
PORT=5001 HOSTNAME=0.0.0.0 pm2 start apps/store/.next/standalone/apps/store/server.js --name candyshop-store
PORT=5002 HOSTNAME=0.0.0.0 pm2 start apps/admin/.next/standalone/apps/admin/server.js --name candyshop-admin
PORT=5003 HOSTNAME=0.0.0.0 pm2 start apps/playground/.next/standalone/apps/playground/server.js --name candyshop-playground
PORT=5004 HOSTNAME=0.0.0.0 pm2 start apps/landing/.next/standalone/apps/landing/server.js --name candyshop-landing
PORT=5005 HOSTNAME=0.0.0.0 pm2 start apps/payments/.next/standalone/apps/payments/server.js --name candyshop-payments
PORT=5006 HOSTNAME=0.0.0.0 pm2 start apps/studio/.next/standalone/apps/studio/server.js --name candyshop-studio

pm2 save
```

**IMPORTANT:** Apps must be started with `node server.js` (standalone output), NOT `pnpm start` / `next start`. The standalone server properly handles `basePath` for path-based routing.

### 8. Nginx Reverse Proxy

The deploy script writes two files:

- `/home/furrycolombia/candyshop-nginx.conf` — server block listening on port 9090
- `/home/furrycolombia/candyshop-proxy.inc` — shared proxy headers

To activate manually (if not using Hestia):

```bash
sudo ln -sf /home/furrycolombia/candyshop-nginx.conf /etc/nginx/conf.d/candyshop.conf
sudo nginx -t && sudo systemctl reload nginx
```

If using Hestia CP, configure the domain `store.furrycolombia.com` to proxy to `127.0.0.1:9090`.

### 9. Cloudflare Tunnel (replaces traditional DNS + SSL)

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
# Note the tunnel ID from the output

# Route DNS (ONLY store.furrycolombia.com — do NOT touch other subdomains)
cloudflared tunnel route dns candyshop-prod store.furrycolombia.com

# Write config
cat > ~/.cloudflared/config.yml << EOF
tunnel: <TUNNEL_ID>
credentials-file: /home/furrycolombia/.cloudflared/<TUNNEL_ID>.json
protocol: http2

ingress:
  - hostname: store.furrycolombia.com
    service: http://127.0.0.1:9090
  - service: http_status:404
EOF

# Install as system service
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/config.yml /etc/cloudflared/config.yml
sudo cp ~/.cloudflared/<TUNNEL_ID>.json /etc/cloudflared/<TUNNEL_ID>.json
sudo cloudflared service install
```

**⚠️ WARNING: Only `store.furrycolombia.com` belongs to this project. `furrycolombia.com` and `moonfest.furrycolombia.com` are separate sites. Never modify their DNS records.**

### 11. GitHub Secrets

Update all secrets listed in the "GitHub Secrets Required" table above.
Use the GitHub CLI:

```bash
gh secret set PROD_SERVER_HOST --body "<NEW_SERVER_IP>"
gh secret set PROD_SERVER_SSH_KEY < ~/.ssh/id_ed25519
# ... etc for all NEXT_PUBLIC_* vars
```

---

## Operational Commands

### PM2

```bash
# View all processes
pm2 list

# View logs (all apps)
pm2 logs

# View logs for one app
pm2 logs candyshop-store

# Restart all
pm2 restart all

# Restart one app
pm2 restart candyshop-store

# Monitor (live dashboard)
pm2 monit
```

### Manual deploy (without CI)

```bash
ssh furrycolombia@192.168.2.71
cd ~/candyshop
git pull origin main
pnpm install --frozen-lockfile --prod=false
STANDALONE=true BASE_PATH_PREFIX="" pnpm run build
pm2 restart all
```

### Nginx

```bash
# Test config
sudo nginx -t

# Reload after config change
sudo systemctl reload nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Webhook Deploy Receiver

| Property | Value                                          |
| -------- | ---------------------------------------------- |
| URL      | `https://deploy.furrycolombia.com/deploy`      |
| Health   | `https://deploy.furrycolombia.com/health`      |
| Port     | 9091 (behind Cloudflare tunnel)                |
| PM2 name | candyshop-webhook                              |
| Secret   | Stored in GitHub webhook settings + server env |
| Trigger  | Push to `main` branch                          |

The webhook receiver replaces GitHub Actions for deployment. When you push to `main`, GitHub sends a webhook to the server, which pulls, builds, and restarts all apps automatically.

## Cloudflare Tunnel

| Property    | Value                                                        |
| ----------- | ------------------------------------------------------------ |
| Tunnel name | candyshop-prod                                               |
| Tunnel ID   | af85209b-fcfb-477a-9b95-81180f6901f2                         |
| Hostname    | store.furrycolombia.com                                      |
| Routes to   | http://127.0.0.1:9090 (Nginx reverse proxy)                  |
| SSL         | Automatic via Cloudflare (no Let's Encrypt needed)           |
| Service     | systemd (`cloudflared.service`), auto-starts on boot         |
| Config      | `/etc/cloudflared/config.yml`                                |
| Credentials | `/etc/cloudflared/af85209b-fcfb-477a-9b95-81180f6901f2.json` |

**IMPORTANT: Only `store.furrycolombia.com` is managed by this tunnel. Do NOT modify DNS records for `furrycolombia.com`, `moonfest.furrycolombia.com`, or any other subdomain — those are separate sites.**

Traffic flow:

```
Browser → Cloudflare CDN (SSL) → cloudflared tunnel → 127.0.0.1:9090 (Nginx) → app ports
```

## Supabase (Cloud)

| Property  | Value                                                         |
| --------- | ------------------------------------------------------------- |
| Provider  | Supabase Cloud (free tier)                                    |
| Project   | candyshop-prod                                                |
| Region    | South America (São Paulo)                                     |
| URL       | `https://olafyajipvsltohagiah.supabase.co`                    |
| Dashboard | `https://supabase.com/dashboard/project/olafyajipvsltohagiah` |
| RLS       | Enabled (automatic)                                           |

**What's included (free tier):**

- 500 MB database
- 1 GB file storage
- 50K monthly active users
- 2 GB bandwidth
- Auto backups (7-day retention)

**Migrations:** Run against the cloud project with:

```bash
supabase link --project-ref olafyajipvsltohagiah
supabase db push
```

---

## Cloud Migration Path

When ready to move from the local server to cloud, the main changes are:

1. **Compute**: Provision a VM (AWS EC2 t3.medium, DigitalOcean 4GB, etc.)
2. **Run the migration runbook** above on the new VM
3. **DNS**: Update `store.furrycolombia.com` A record to the new public IP
4. **GitHub Secrets**: Update `PROD_SERVER_HOST` and `PROD_SERVER_SSH_KEY`
5. **SSL**: Let's Encrypt works the same way on any server
6. **Optional upgrades**:
   - Add a load balancer (ALB, Cloudflare) in front
   - Use Docker/containers instead of bare PM2
   - Add a CDN for static assets
   - Move to container orchestration (ECS, Kubernetes) for auto-scaling

The CI/CD pipeline (`deploy-production.yml`) works identically — it just SSHs into whatever IP is in the secrets.

---

## Troubleshooting

| Symptom                    | Check                                            |
| -------------------------- | ------------------------------------------------ |
| App not responding         | `pm2 logs candyshop-<app>`                       |
| 502 Bad Gateway            | Is the app running? `pm2 list`                   |
| Build fails on server      | Check Node version: `node --version` (needs 22+) |
| SSH connection refused     | Check `~/.ssh/authorized_keys` on server         |
| Nginx config error         | `sudo nginx -t`                                  |
| PM2 not starting on reboot | Re-run `pm2 startup` and `pm2 save`              |
| Disk full                  | `df -h` and clean old builds: `git clean -fdx`   |
