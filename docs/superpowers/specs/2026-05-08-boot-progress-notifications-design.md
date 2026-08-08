# Boot Progress Notifications — Design Spec

**Issue:** GH-264
**Date:** 2026-05-08
**Status:** Approved

## Problem

During the v2026.05.08.1 deployment the store returned 502 Bad Gateway while the container
was still booting. There was no visibility into which apps were up, which were still starting,
or how long to expect. Operators had no signal except to wait and refresh.

---

## Goals

1. Send a live-updating Telegram progress message during container boot (deploy path).
2. Send a live-updating Telegram progress message during OS server reboot (host PM2 path).
3. New critical messages only for failures — not for every stage (hybrid approach).
4. Full unattended delivery: no manual steps required after merging to main.

---

## Architecture

Two boot paths are handled independently to avoid overlap and stale-message edits.

```
OS Reboot
  systemd → PM2 → boot-notifier.mjs (host)
                    │
                    ├── creates Telegram progress message
                    └── polls health endpoints every 5s, edits message live

Deploy (docker run)
  deploy-production.sh
    ├── creates Telegram progress message → captures message_id
    ├── passes TELEGRAM_BOOT_MSG_ID=<id> to docker run
    └── replaces sleep 60 with active poll loop

  container (supervisord)
    └── boot-reporter.mjs [program:boot-reporter]
          ├── checks TELEGRAM_BOOT_MSG_ID + /proc/uptime
          ├── if uptime < 120s → OS boot → skip (host handles it)
          └── else → deploy boot → polls each port every 3s, edits message
```

### Key invariant: uptime gate

`/proc/uptime` is shared between host and container (same kernel). If the container's
uptime reading is < 120 seconds, the server just rebooted — the host `boot-notifier.mjs`
is already managing the progress message. `boot-reporter.mjs` exits immediately to avoid
double-editing.

If uptime ≥ 120 seconds, it is a deploy restart. `TELEGRAM_BOOT_MSG_ID` is fresh and
`boot-reporter.mjs` owns the message edits.

---

## Telegram Message Format

### Live-edited progress message

```
🔄 Container Boot — 2026-05-08 03:45 UTC

Progress: 4/7  ████████████░░░░  57%

  ✅ auth         8s
  ✅ store        12s
  ✅ payments     15s
  ✅ admin        18s
  ⏳ landing      ...
  ⏳ studio       ...
  ⏳ playground   ...
  ⏳ nginx        waiting for all apps...

Elapsed: 21s
```

### Final edit (all healthy)

```
✅ All 7 apps ready — Boot in 1m 34s
   nginx up — traffic restored
```

### Failure (new critical message, not an edit)

```
❌ studio failed to start after 120s
   Check: docker logs libra-prod
```

Progress bar uses Unicode block characters: `█` (filled) and `░` (empty), 16 chars wide.

---

## Files

| File                               | Change   | Responsibility                                         |
| ---------------------------------- | -------- | ------------------------------------------------------ |
| `scripts/server/boot-notifier.mjs` | NEW      | OS reboot detection + host-side progress               |
| `docker/boot-reporter.mjs`         | NEW      | In-container per-port progress signaling               |
| `docker/prod/supervisord.conf`     | MODIFIED | Add `[program:boot-reporter]`                          |
| `docker/prod/Dockerfile`           | MODIFIED | `COPY docker/boot-reporter.mjs /app/boot-reporter.mjs` |
| `scripts/deploy-production.sh`     | MODIFIED | Create message, pass MSG_ID, replace sleep             |

---

## Component Specs

### 1. `scripts/server/boot-notifier.mjs`

**Runtime:** Node.js, managed by PM2 on the host.
**Started by:** `pm2 start` in deploy-production.sh (same as watcher), persisted by `pm2 save`.
**Telegram credentials:** inherited from PM2 environment (set during deploy, persisted by `pm2 save`).

**Behavior on startup:**

1. Read `/proc/uptime`. If uptime ≥ 120s → not a fresh boot → idle loop, no notification.
2. If uptime < 120s → OS boot detected.
3. Send initial Telegram progress message → store `message_id`.
4. Poll loop (every 5s, max 180s):
   - For each of the 7 apps: `fetch http://127.0.0.1:${NGINX_PORT}/<health-path>` with 5s timeout.
   - Track first-seen timestamps per app.
   - Edit Telegram message with updated progress bar and per-app status.
5. When all 7 apps healthy: final edit "✅ All 7 apps ready", stop polling.
6. If any app not healthy after 180s: new critical message listing failed apps, stop polling.
7. Enter idle loop (100s interval no-op) so PM2 doesn't restart it as a crash.

**Environment variables required (same as watcher):**

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_THREAD_ID`
- `TELEGRAM_CRITICAL_THREAD_ID`
- `WATCHER_NGINX_PORT` (same as watcher, set by deploy-production.sh)

**deploy-production.sh additions:**

```bash
pm2 delete libra-boot-notifier 2>/dev/null || true
WATCHER_NGINX_PORT=$HOST_PORT pm2 start "$DEPLOY_DIR/scripts/server/boot-notifier.mjs" \
  --name libra-boot-notifier
pm2 save
```

### 2. `docker/boot-reporter.mjs`

**Runtime:** Node.js, inside container, managed by supervisord.
**Started by:** supervisord as `[program:boot-reporter]` with `autorestart=false`.
**Telegram credentials:** passed via `docker run -e` (already done for TOKEN, CHAT_ID, THREAD_ID).
**New env var:** `TELEGRAM_BOOT_MSG_ID` — the Telegram message ID to edit.

**Behavior:**

1. Read `TELEGRAM_BOOT_MSG_ID`. If not set → exit 0 (no-op, old container or non-deploy start).
2. Read `/proc/uptime`. If < 120s → OS boot → exit 0 (host handles it).
3. Record `startTime = Date.now()`.
4. Poll loop (every 3s, max 120s):
   - For each of the 7 apps: check if port is listening using Node.js `net.createConnection`.
   - Track first-seen timestamps per app.
   - Call `editMessageText` on `TELEGRAM_BOOT_MSG_ID` with updated progress bar.
5. When all 7 ports open: final edit including nginx port (8080) check, then exit 0.
6. If any port not open after 120s: send new critical message, exit 1.

**Ports checked:**

- auth: 5000, store: 5001, admin: 5002, playground: 5003, landing: 5004, payments: 5005, studio: 5006, nginx: 8080

**supervisord entry:**

```ini
[program:boot-reporter]
command=node /app/boot-reporter.mjs
directory=/app
user=nextjs
autostart=true
autorestart=false
startretries=0
startsecs=0
exitcodes=0,1
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
```

`autorestart=false` and `startretries=0`: this is a one-shot script, not a daemon.

### 3. `scripts/deploy-production.sh` changes

**Before `docker rm -f` / `docker run`:**

```bash
# Create boot progress message; capture message_id for container to edit
_BOOT_MSG_ID=$(python3 -c "..." send initial message, parse response.result.message_id)
```

**In `docker run`:**

```bash
docker run -d \
  ...existing -e flags...
  -e "TELEGRAM_BOOT_MSG_ID=${_BOOT_MSG_ID:-}" \
  "$IMAGE_TAG"
```

**Replace `sleep 60`:**

```bash
# Poll health endpoints instead of blind sleep (max 120s)
log "Waiting for container health endpoints..."
_POLL_START=$(date +%s)
_ALL_HEALTHY=0
while [ $(( $(date +%s) - _POLL_START )) -lt 120 ]; do
  _HEALTHY_COUNT=0
  for APP_ENTRY in "${APPS[@]}"; do
    APP_HEALTH="${APP_ENTRY#*:}"
    curl -sf --max-time 5 "http://localhost:${HOST_PORT}${APP_HEALTH}" >/dev/null 2>&1 && \
      _HEALTHY_COUNT=$(( _HEALTHY_COUNT + 1 ))
  done
  if [ "$_HEALTHY_COUNT" -eq "${#APPS[@]}" ]; then
    _ALL_HEALTHY=1
    break
  fi
  sleep 5
done
```

The existing phase-1 liveness check and phase-2 JIT warm-up remain unchanged after this loop.

---

## Prerequisites

### PM2 startup (one-time server setup)

`boot-notifier.mjs` relies on PM2 being configured as a systemd service so it restarts on
OS reboot. Check and configure if needed:

```bash
# On the server — check
systemctl status pm2-furrycolombia

# If NOT configured, run once:
pm2 startup   # generates and prints a systemd command
# Then run the printed command as root
```

This is a manual prerequisite that must be verified before the feature can work for OS reboots.
The implementation plan includes a verification step in the deploy script that warns via
Telegram if PM2 startup is not active.

---

## Error Handling

| Scenario                                    | Behavior                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN` missing                | All notifiers silently skip Telegram calls (no crash)                            |
| `editMessageText` fails (throttle, network) | Log warning, continue polling — next edit attempt in 3–5s                        |
| App never comes up (deploy, 120s)           | New critical Telegram message; deploy script still runs health check and reports |
| App never comes up (OS boot, 180s)          | New critical Telegram message; boot-notifier goes idle                           |
| `TELEGRAM_BOOT_MSG_ID` not set              | boot-reporter exits 0 silently                                                   |
| uptime < 120s in container                  | boot-reporter exits 0, host handles it                                           |

---

## Testing

- Manual: trigger a deploy and observe Telegram messages updating in real time.
- Manual: SSH into server, `sudo reboot`, observe OS boot notification sequence.
- No automated tests required for this infra-only change (no application code touched).

---

## Non-goals

- No changes to application code or API routes.
- No changes to the Docker health endpoints (`/health`).
- No changes to `docker/watcher.mjs` (existing health watcher remains unchanged).
- `boot-notifier.mjs` does not replace `watcher.mjs` — they serve different purposes.
