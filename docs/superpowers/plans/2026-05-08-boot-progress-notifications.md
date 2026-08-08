# Boot Progress Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send live-updating Telegram progress messages during container boot (deploy path) and OS server reboot (PM2 path), with new critical messages only for failures.

**Architecture:** Two separate scripts handle OS reboot (host PM2 `boot-notifier.mjs`) and deploy-time boot (in-container supervisord `boot-reporter.mjs`). A `/proc/uptime` gate (shared kernel) prevents both from running simultaneously. The host creates the initial Telegram progress message, passes `TELEGRAM_BOOT_MSG_ID` to the container via `docker run -e`, and the container edits it as ports open.

**Tech Stack:** Node.js ESM (fetch, net, fs — built-ins only), bash, supervisord, PM2

---

## Files

| File                               | Change                                              |
| ---------------------------------- | --------------------------------------------------- |
| `scripts/server/boot-notifier.mjs` | CREATE — host-side OS boot detection + progress     |
| `docker/boot-reporter.mjs`         | CREATE — in-container deploy boot progress          |
| `docker/prod/supervisord.conf`     | MODIFY — add `[program:boot-reporter]`              |
| `docker/prod/Dockerfile`           | MODIFY — COPY boot-reporter.mjs                     |
| `scripts/deploy-production.sh`     | MODIFY — create message, pass MSG_ID, replace sleep |

---

### Task 1: `scripts/server/boot-notifier.mjs`

**Files:**

- Create: `scripts/server/boot-notifier.mjs`

- [ ] **Step 1: Write the file**

```javascript
#!/usr/bin/env node
/**
 * boot-notifier.mjs — Host-side PM2 process for OS reboot detection.
 * Sends a live-updating Telegram progress message when uptime < 120s.
 * Goes idle (100s loop) when uptime >= 120s (deploy restart — container handles it).
 */

import { readFileSync } from "fs";

const NGINX_PORT = process.env.WATCHER_NGINX_PORT || "9090";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const THREAD_ID = process.env.TELEGRAM_THREAD_ID || "";
const CRITICAL_THREAD_ID = process.env.TELEGRAM_CRITICAL_THREAD_ID || THREAD_ID;

const APPS = [
  { name: "auth", path: "/auth/health" },
  { name: "store", path: "/store/health" },
  { name: "admin", path: "/admin/health" },
  { name: "playground", path: "/playground/health" },
  { name: "landing", path: "/en" },
  { name: "payments", path: "/payments/health" },
  { name: "studio", path: "/studio/health" },
];

function readUptime() {
  try {
    return parseFloat(readFileSync("/proc/uptime", "utf8").split(" ")[0]);
  } catch {
    return 9999;
  }
}

async function tgPost(text, threadId) {
  if (!BOT_TOKEN || !CHAT_ID) return null;
  try {
    const body = { chat_id: CHAT_ID, text, parse_mode: "HTML" };
    if (threadId) body.message_thread_id = parseInt(threadId);
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const d = await res.json();
    return d.ok ? d.result.message_id : null;
  } catch {
    return null;
  }
}

async function tgEdit(msgId, text) {
  if (!BOT_TOKEN || !CHAT_ID || !msgId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        message_id: msgId,
        text,
        parse_mode: "HTML",
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {}
}

async function checkHealth(path) {
  try {
    const res = await fetch(`http://127.0.0.1:${NGINX_PORT}${path}`, {
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function bar(ready, total) {
  const n = Math.round((ready / total) * 16);
  return "█".repeat(n) + "░".repeat(16 - n);
}

function elapsed(startTime) {
  const s = Math.round((Date.now() - startTime) / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

function formatProgress(appStatus, startTime, label) {
  const ready = appStatus.filter((a) => a.readyAt !== null).length;
  const total = appStatus.length;
  const pct = Math.round((ready / total) * 100);
  const dateStr =
    new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

  const rows = appStatus.map((a) => {
    if (a.readyAt !== null) {
      const s = Math.round((a.readyAt - startTime) / 1000);
      return `  ✅ ${a.name.padEnd(12)}${s}s`;
    }
    return `  ⏳ ${a.name.padEnd(12)}...`;
  });
  rows.push(`  ⏳ ${"nginx".padEnd(12)}waiting for all apps...`);

  return [
    `🔄 <b>${label}</b> — ${dateStr}`,
    "",
    `Progress: ${ready}/${total}  ${bar(ready, total)}  ${pct}%`,
    "",
    ...rows,
    "",
    `Elapsed: ${elapsed(startTime)}`,
  ].join("\n");
}

async function runBootSequence(label) {
  const startTime = Date.now();
  const appStatus = APPS.map((a) => ({ ...a, readyAt: null }));

  const msgId = await tgPost(
    formatProgress(appStatus, startTime, label),
    THREAD_ID,
  );

  const deadline = startTime + 180_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5_000));

    for (const app of appStatus) {
      if (app.readyAt === null && (await checkHealth(app.path))) {
        app.readyAt = Date.now();
      }
    }

    if (appStatus.every((a) => a.readyAt !== null)) {
      const dur = elapsed(startTime);
      await tgEdit(
        msgId,
        `✅ <b>All ${APPS.length} apps ready</b> — Boot in ${dur}\n   nginx up — traffic restored`,
      );
      return;
    }

    await tgEdit(msgId, formatProgress(appStatus, startTime, label));
  }

  const failed = appStatus
    .filter((a) => a.readyAt === null)
    .map((a) => a.name)
    .join(", ");
  await tgPost(
    `❌ <b>${failed} failed to start after 180s</b>\n   Check: <code>docker logs candyshop-prod</code>`,
    CRITICAL_THREAD_ID,
  );
}

async function main() {
  if (readUptime() >= 120) {
    while (true) await new Promise((r) => setTimeout(r, 100_000));
  }
  await runBootSequence("Server Boot");
  while (true) await new Promise((r) => setTimeout(r, 100_000));
}

main().catch((err) => {
  console.error("[boot-notifier]", err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/server/boot-notifier.mjs
git commit -m "feat(infra): add boot-notifier host-side PM2 process [GH-264]"
```

---

### Task 2: `docker/boot-reporter.mjs`

**Files:**

- Create: `docker/boot-reporter.mjs`

- [ ] **Step 1: Write the file**

```javascript
#!/usr/bin/env node
/**
 * boot-reporter.mjs — In-container one-shot progress reporter.
 * Managed by supervisord (autorestart=false, startretries=0).
 *
 * Uptime gate: /proc/uptime is shared with the host kernel.
 * If uptime < 120s → OS boot → host boot-notifier.mjs handles it → exit 0.
 * If TELEGRAM_BOOT_MSG_ID is unset → non-deploy start → exit 0.
 */

import { createConnection } from "net";
import { readFileSync } from "fs";

const BOOT_MSG_ID = parseInt(process.env.TELEGRAM_BOOT_MSG_ID || "0") || 0;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const CRITICAL_THREAD_ID =
  process.env.TELEGRAM_CRITICAL_THREAD_ID ||
  process.env.TELEGRAM_THREAD_ID ||
  "";

if (!BOOT_MSG_ID) process.exit(0);

try {
  const uptime = parseFloat(readFileSync("/proc/uptime", "utf8").split(" ")[0]);
  if (uptime < 120) process.exit(0);
} catch {}

const APPS = [
  { name: "auth", port: 5000 },
  { name: "store", port: 5001 },
  { name: "admin", port: 5002 },
  { name: "playground", port: 5003 },
  { name: "landing", port: 5004 },
  { name: "payments", port: 5005 },
  { name: "studio", port: 5006 },
];
const NGINX_PORT = 8080;

function checkPort(port) {
  return new Promise((resolve) => {
    const s = createConnection({ port, host: "127.0.0.1", timeout: 2_000 });
    s.on("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.on("timeout", () => {
      s.destroy();
      resolve(false);
    });
  });
}

async function tgEdit(text) {
  if (!BOT_TOKEN || !CHAT_ID || !BOOT_MSG_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        message_id: BOOT_MSG_ID,
        text,
        parse_mode: "HTML",
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {}
}

async function tgCritical(text) {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    const body = { chat_id: CHAT_ID, text, parse_mode: "HTML" };
    if (CRITICAL_THREAD_ID)
      body.message_thread_id = parseInt(CRITICAL_THREAD_ID);
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {}
}

function bar(ready, total) {
  const n = Math.round((ready / total) * 16);
  return "█".repeat(n) + "░".repeat(16 - n);
}

function elapsed(startTime) {
  const s = Math.round((Date.now() - startTime) / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

function formatProgress(appStatus, startTime) {
  const ready = appStatus.filter((a) => a.readyAt !== null).length;
  const total = appStatus.length;
  const pct = Math.round((ready / total) * 100);
  const dateStr =
    new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

  const rows = appStatus.map((a) => {
    if (a.readyAt !== null) {
      const s = Math.round((a.readyAt - startTime) / 1000);
      return `  ✅ ${a.name.padEnd(12)}${s}s`;
    }
    return `  ⏳ ${a.name.padEnd(12)}...`;
  });
  rows.push(`  ⏳ ${"nginx".padEnd(12)}waiting for all apps...`);

  return [
    `🔄 <b>Container Boot</b> — ${dateStr}`,
    "",
    `Progress: ${ready}/${total}  ${bar(ready, total)}  ${pct}%`,
    "",
    ...rows,
    "",
    `Elapsed: ${elapsed(startTime)}`,
  ].join("\n");
}

async function main() {
  const startTime = Date.now();
  const appStatus = APPS.map((a) => ({ ...a, readyAt: null }));

  const deadline = startTime + 120_000;

  while (Date.now() < deadline) {
    for (const app of appStatus) {
      if (app.readyAt === null && (await checkPort(app.port))) {
        app.readyAt = Date.now();
      }
    }

    if (appStatus.every((a) => a.readyAt !== null)) {
      const nginxOk = await checkPort(NGINX_PORT);
      const dur = elapsed(startTime);
      await tgEdit(
        nginxOk
          ? `✅ <b>All ${APPS.length} apps ready</b> — Boot in ${dur}\n   nginx up — traffic restored`
          : `✅ <b>All ${APPS.length} apps ready</b> — Boot in ${dur}\n   ⚠️ nginx not yet up`,
      );
      process.exit(0);
    }

    await tgEdit(formatProgress(appStatus, startTime));
    await new Promise((r) => setTimeout(r, 3_000));
  }

  const failed = appStatus
    .filter((a) => a.readyAt === null)
    .map((a) => a.name)
    .join(", ");
  await tgCritical(
    `❌ <b>${failed} failed to start after 120s</b>\n   Check: <code>docker logs candyshop-prod</code>`,
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("[boot-reporter]", err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add docker/boot-reporter.mjs
git commit -m "feat(infra): add boot-reporter in-container one-shot progress reporter [GH-264]"
```

---

### Task 3: `docker/prod/supervisord.conf` + `Dockerfile`

**Files:**

- Modify: `docker/prod/supervisord.conf`
- Modify: `docker/prod/Dockerfile`

- [ ] **Step 1: Add `[program:boot-reporter]` to supervisord.conf**

After the `[program:watcher]` stanza, append:

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

- [ ] **Step 2: Add COPY to Dockerfile**

After `COPY docker/watcher.mjs /app/watcher.mjs`, add:

```dockerfile
COPY docker/boot-reporter.mjs               /app/boot-reporter.mjs
```

- [ ] **Step 3: Commit**

```bash
git add docker/prod/supervisord.conf docker/prod/Dockerfile
git commit -m "feat(infra): wire boot-reporter into supervisord and Dockerfile [GH-264]"
```

---

### Task 4: `scripts/deploy-production.sh`

**Files:**

- Modify: `scripts/deploy-production.sh`

- [ ] **Step 1: Create initial progress message before docker rm**

Add before the `docker rm -f` line:

```bash
# Create boot progress message; container edits it via TELEGRAM_BOOT_MSG_ID
_BOOT_MSG_ID=""
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  _boot_now=$(python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'))" 2>/dev/null || true)
  _BOOT_RESP=$(python3 -c "
import json, urllib.request
text = (
  '🔄 <b>Container Boot</b> — $_boot_now\n\n'
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
payload = {'chat_id': '${TELEGRAM_CHAT_ID}', 'text': text, 'parse_mode': 'HTML'}
thread = '${TELEGRAM_THREAD_ID:-}'
if thread:
    payload['message_thread_id'] = int(thread)
data = json.dumps(payload).encode()
req = urllib.request.Request(
    'https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage',
    data=data, headers={'Content-Type': 'application/json'}, method='POST')
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        resp = json.loads(r.read())
        if resp.get('ok'):
            print(resp['result']['message_id'])
except Exception:
    pass
" 2>/dev/null || true)
  _BOOT_MSG_ID="${_BOOT_RESP:-}"
fi
```

- [ ] **Step 2: Add TELEGRAM_BOOT_MSG_ID to docker run**

Add `-e "TELEGRAM_BOOT_MSG_ID=${_BOOT_MSG_ID:-}" \` after the existing `-e` flags.

- [ ] **Step 3: Remove redundant "Container restarted" notification**

Delete the `notify_telegram "$(printf '🔄 <b>Container restarted</b>..."` line — the progress message covers this.

- [ ] **Step 4: Add boot-notifier PM2 start before pm2 save**

After `pm2 start libra-watcher` and before `pm2 save`:

```bash
pm2 delete libra-boot-notifier 2>/dev/null || true
WATCHER_NGINX_PORT=$HOST_PORT pm2 start "$DEPLOY_DIR/scripts/server/boot-notifier.mjs" \
  --name libra-boot-notifier
```

- [ ] **Step 5: Move APPS definition before sleep 60 and replace sleep with poll loop**

Move `APPS=(...)` before `sleep 60`, then replace `sleep 60` with:

```bash
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
```

- [ ] **Step 6: Commit**

```bash
git add scripts/deploy-production.sh
git commit -m "feat(infra): integrate boot progress into deploy script [GH-264]"
```

---

## Testing

Manual verification only (infra-only change):

1. Trigger a deploy and observe Telegram messages updating in real time.
2. Verify the progress message starts at 0/7 and advances as apps come up.
3. Verify the final message shows "All 7 apps ready — nginx up".
4. OS reboot: `sudo reboot`, observe separate boot notification sequence from host.

No automated tests required — no application code touched.
