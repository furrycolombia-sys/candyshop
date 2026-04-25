#!/usr/bin/env node
/**
 * watcher.mjs — in-process health watcher
 *
 * Runs via PM2 alongside all the Next.js apps.
 * Pings each app's /health endpoint at a random 5–10 minute interval.
 * Also monitors system resources (RAM, disk) and the Cloudflare tunnel.
 * Detects up→down and down→up transitions and (optionally) alerts via Telegram.
 *
 * Telegram env vars (set in compose.yml or the server env):
 *   TELEGRAM_BOT_TOKEN  — bot token from @BotFather
 *   TELEGRAM_CHAT_ID    — chat or group ID to send alerts to
 *   TELEGRAM_THREAD_ID  — (optional) forum topic thread ID for supergroups
 *
 * Tuning (optional):
 *   WATCHER_MIN_MS  — minimum interval in ms  (default: 300_000 = 5 min)
 *   WATCHER_MAX_MS  — maximum interval in ms  (default: 600_000 = 10 min)
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

// ── Configuration ─────────────────────────────────────────────────────────────

const MIN_MS = Number(process.env.WATCHER_MIN_MS ?? 300_000);
const MAX_MS = Number(process.env.WATCHER_MAX_MS ?? 600_000);
const TIMEOUT_MS = 8_000;
const STARTUP_GRACE_MS = 90_000; // wait before first check so apps can boot

// Re-alert on a persistent problem at most once per 2 hours
const REPEAT_ALERT_MS = 2 * 60 * 60 * 1_000;

// System resource thresholds
const RAM_CRITICAL_MB = 200;
const RAM_WARN_MB     = 400;
const DISK_CRITICAL_PCT = 90;
const DISK_WARN_PCT     = 80;

const TELEGRAM_TOKEN           = process.env.TELEGRAM_BOT_TOKEN          ?? "";
const TELEGRAM_CHAT            = process.env.TELEGRAM_CHAT_ID             ?? "";
const TELEGRAM_THREAD          = process.env.TELEGRAM_THREAD_ID           ?? "";
const TELEGRAM_CRITICAL_THREAD = process.env.TELEGRAM_CRITICAL_THREAD_ID ?? TELEGRAM_THREAD;

// Consecutive tunnel-detection failures required before alerting (avoids
// false positives when pgrep can't see a Docker/systemd-managed process on first check)
let tunnelFailStreak = 0;

// When WATCHER_NGINX_PORT is set (host PM2 watcher), check via the nginx
// reverse proxy so alerts reflect the real Cloudflare traffic path:
//   Cloudflare → Hestia nginx → Docker nginx (9090) → app
// Without it (Docker-internal watcher), check direct ports so supervisord
// failures are caught before nginx ever sees them.
const NGINX_PORT = process.env.WATCHER_NGINX_PORT ?? null;

const APPS = [
  { name: "store",      directUrl: "http://127.0.0.1:5001/store/health",      nginxPath: "/store/health"      },
  { name: "auth",       directUrl: "http://127.0.0.1:5000/auth/health",       nginxPath: "/auth/health"       },
  { name: "admin",      directUrl: "http://127.0.0.1:5002/admin/health",      nginxPath: "/admin/health"      },
  { name: "landing",    directUrl: "http://127.0.0.1:5004/health",            nginxPath: "/"                  },
  { name: "payments",   directUrl: "http://127.0.0.1:5005/payments/health",   nginxPath: "/payments/health"   },
  { name: "studio",     directUrl: "http://127.0.0.1:5006/studio/health",     nginxPath: "/studio/health"     },
  { name: "playground", directUrl: "http://127.0.0.1:5003/playground/health", nginxPath: "/playground/health" },
].map(({ name, directUrl, nginxPath }) => ({
  name,
  url: NGINX_PORT ? `http://127.0.0.1:${NGINX_PORT}${nginxPath}` : directUrl,
}));

// Warm-up routes — only used when checking via nginx (the real traffic path).
// Hitting these every cycle keeps V8 JIT-compiled between deploys so there
// are no cold-start penalties on real user requests.
const WARM_ROUTES = NGINX_PORT
  ? [
      "/",
      "/en",
      "/es",
      "/store",
      "/store/en",
      "/store/es",
      "/payments",
      "/payments/en",
      "/payments/es",
      "/auth",
      "/auth/en",
      "/admin",
      "/admin/en",
      "/studio",
      "/studio/en",
    ].map((path) => `http://127.0.0.1:${NGINX_PORT}${path}`)
  : [];

// ── State tracking ────────────────────────────────────────────────────────────

// Possible values: "unknown" | "up" | "down"
const state = Object.fromEntries(APPS.map((a) => [a.name, "unknown"]));

// System state: "unknown" | "ok" | "warning" | "critical"
const sysState = { ram: "unknown", disk: "unknown", tunnel: "unknown" };

// Cooldown map: key → timestamp of last alert sent for that key
const lastAlerted = new Map();

// ── Telegram ──────────────────────────────────────────────────────────────────

async function sendTelegramTo(text, threadId) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT,
          text,
          parse_mode: "HTML",
          ...(threadId ? { message_thread_id: Number(threadId) } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`[watcher] telegram error ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error(`[watcher] telegram send failed: ${err.message}`);
  }
}

// Regular channel — deploy steps, recoveries, info
async function sendTelegram(text) {
  return sendTelegramTo(text, TELEGRAM_THREAD || null);
}

// Critical channel — DOWN alerts, resource warnings, failures
async function sendTelegramCritical(text) {
  return sendTelegramTo(text, TELEGRAM_CRITICAL_THREAD || TELEGRAM_THREAD || null);
}

/**
 * Alert on transition OR repeat a persistent alert after the cooldown window.
 * @param {string} key    — unique identifier for the alert category
 * @param {boolean} isNew — true if this is a new transition (prev state was ok/unknown)
 * @param {string} text   — HTML message to send
 */
async function maybeAlert(key, isNew, text) {
  const now = Date.now();
  if (isNew) {
    lastAlerted.set(key, now);
    await sendTelegramCritical(text);
    return;
  }
  // Persistent problem — re-alert only after cooldown
  const last = lastAlerted.get(key) ?? 0;
  if (now - last >= REPEAT_ALERT_MS) {
    lastAlerted.set(key, now);
    await sendTelegramCritical(text);
  }
}

// ── System health checks ──────────────────────────────────────────────────────

function readRamFreeBytes() {
  try {
    const meminfo = readFileSync("/proc/meminfo", "utf8");
    // MemAvailable is the best indicator of free+reclaimable RAM
    const match = meminfo.match(/^MemAvailable:\s+(\d+)\s+kB/m);
    if (match) return Number(match[1]) * 1024;
    // Fallback: MemFree
    const fallback = meminfo.match(/^MemFree:\s+(\d+)\s+kB/m);
    if (fallback) return Number(fallback[1]) * 1024;
  } catch {
    // not Linux or no /proc — ignore
  }
  return null;
}

function readDiskUsedPct() {
  try {
    const result = spawnSync("df", ["-P", "/"], { encoding: "utf8", timeout: 5_000 });
    if (result.status !== 0) return null;
    // Output: Filesystem  1024-blocks  Used  Available  Capacity%  Mounted
    const lines = result.stdout.trim().split("\n");
    const data = lines[1];
    const match = data?.match(/(\d+)%/);
    if (match) return Number(match[1]);
  } catch {
    // df not available
  }
  return null;
}

function isTunnelRunning() {
  // Inside a Docker container, host processes are not visible via PID namespace
  // isolation — pgrep and systemctl will never find the host's cloudflared.
  // Return null to skip the check entirely rather than sending false DOWN alerts.
  try {
    if (existsSync("/.dockerenv")) return null;
  } catch { /* ignore */ }

  // Method 1: exact process name (native install)
  try {
    const r = spawnSync("pgrep", ["-x", "cloudflared"], { encoding: "utf8", timeout: 3_000 });
    if (r.status === 0) return true;
  } catch { /* ignore */ }

  // Method 2: full command-line match (handles systemd ExecStart paths, wrappers)
  try {
    const r = spawnSync("pgrep", ["-f", "cloudflared tunnel"], { encoding: "utf8", timeout: 3_000 });
    if (r.status === 0) return true;
  } catch { /* ignore */ }

  // Method 3: systemd service
  try {
    const r = spawnSync("systemctl", ["is-active", "--quiet", "cloudflared"], { encoding: "utf8", timeout: 3_000 });
    if (r.status === 0) return true;
  } catch { /* ignore */ }

  return false;
}

async function checkSystem() {
  // ── RAM ──
  const ramBytes = readRamFreeBytes();
  if (ramBytes !== null) {
    const ramMB = ramBytes / (1024 * 1024);
    const prev = sysState.ram;
    let next;
    if (ramMB < RAM_CRITICAL_MB) next = "critical";
    else if (ramMB < RAM_WARN_MB) next = "warning";
    else next = "ok";

    if (next !== "ok") {
      const icon = next === "critical" ? "🔴" : "🟡";
      const severity = next === "critical" ? "CRITICAL" : "warning";
      const msg = `${icon} <b>RAM ${severity}</b>\nAvailable: <code>${ramMB.toFixed(0)} MB</code>`;
      await maybeAlert("ram", prev === "ok" || prev === "unknown", msg);
      console.error(`[watcher] RAM ${next}: ${ramMB.toFixed(0)} MB available`);
    } else if (prev === "warning" || prev === "critical") {
      await sendTelegram(`✅ <b>RAM recovered</b>\nAvailable: <code>${ramMB.toFixed(0)} MB</code>`);
      console.log(`[watcher] RAM recovered: ${ramMB.toFixed(0)} MB`);
    } else {
      console.log(`[watcher] RAM ok: ${ramMB.toFixed(0)} MB`);
    }
    sysState.ram = next;
  }

  // ── Disk ──
  const diskPct = readDiskUsedPct();
  if (diskPct !== null) {
    const prev = sysState.disk;
    let next;
    if (diskPct >= DISK_CRITICAL_PCT) next = "critical";
    else if (diskPct >= DISK_WARN_PCT) next = "warning";
    else next = "ok";

    if (next !== "ok") {
      const icon = next === "critical" ? "🔴" : "🟡";
      const severity = next === "critical" ? "CRITICAL" : "warning";
      const msg = `${icon} <b>Disk ${severity}</b>\nUsed: <code>${diskPct}%</code> of root filesystem`;
      await maybeAlert("disk", prev === "ok" || prev === "unknown", msg);
      console.error(`[watcher] Disk ${next}: ${diskPct}% used`);
    } else if (prev === "warning" || prev === "critical") {
      await sendTelegram(`✅ <b>Disk recovered</b>\nUsed: <code>${diskPct}%</code>`);
      console.log(`[watcher] Disk recovered: ${diskPct}%`);
    } else {
      console.log(`[watcher] Disk ok: ${diskPct}%`);
    }
    sysState.disk = next;
  }

  // ── Cloudflare tunnel ──
  const tunnelUp = isTunnelRunning();
  if (tunnelUp !== null) {
    const prev = sysState.tunnel;

    if (!tunnelUp) {
      tunnelFailStreak++;
      // Require 2 consecutive failures before marking as critical / alerting.
      // This prevents false positives on the first check after a watcher restart
      // when pgrep transiently can't see the process.
      if (tunnelFailStreak >= 2) {
        sysState.tunnel = "critical";
        const msg = `🔴 <b>Cloudflare tunnel is DOWN</b>\n<code>cloudflared</code> process not found — SSH access and public routing may be unavailable`;
        await maybeAlert("tunnel", prev !== "critical", msg);
        console.error("[watcher] Cloudflare tunnel: DOWN");
      } else {
        console.warn(`[watcher] Cloudflare tunnel: detection failed (${tunnelFailStreak}/2 — not alerting yet)`);
      }
    } else {
      const wasDown = prev === "critical";
      tunnelFailStreak = 0;
      sysState.tunnel = "ok";
      if (wasDown) {
        await sendTelegram(`✅ <b>Cloudflare tunnel recovered</b>\n<code>cloudflared</code> is running again`);
        console.log("[watcher] Cloudflare tunnel: recovered");
      } else {
        console.log("[watcher] Cloudflare tunnel: ok");
      }
    }
  }
}

// ── V8 warm-up ────────────────────────────────────────────────────────────────

async function warmUp() {
  if (WARM_ROUTES.length === 0) return;
  const start = Date.now();
  const results = await Promise.allSettled(
    WARM_ROUTES.map((url) =>
      fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "manual" })
        .then((res) => { if (res.status >= 400) throw new Error(`HTTP ${res.status}`); }),
    ),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  const dur = ((Date.now() - start) / 1000).toFixed(1);
  if (failed > 0) {
    console.warn(`[watcher] warm-up: ${failed}/${WARM_ROUTES.length} routes failed in ${dur}s`);
  } else {
    console.log(`[watcher] warm-up: all ${WARM_ROUTES.length} routes ok in ${dur}s`);
  }
}

// ── Ping one app ──────────────────────────────────────────────────────────────

async function ping(app) {
  const prev = state[app.name];

  try {
    // redirect: 'manual' prevents fetch from following 307s into 404s.
    // Next.js i18n middleware redirects /store/health → /store/en/health,
    // which itself returns 404. We only care that the app responds (any
    // 1xx/2xx/3xx = alive); 4xx/5xx mean the app is broken.
    const res = await fetch(app.url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "manual",
    });

    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);

    if (prev === "down") {
      console.log(`[watcher] ${app.name}: ✓ recovered`);
      state[app.name] = "up";
      await sendTelegram(`✅ <b>${app.name}</b> is back up`);
    } else {
      console.log(`[watcher] ${app.name}: ok`);
      state[app.name] = "up";
    }
  } catch (err) {
    state[app.name] = "down";

    if (prev === "up") {
      console.error(`[watcher] ${app.name}: ✗ DOWN — ${err.message}`);
      await sendTelegramCritical(
        `🔴 <b>${app.name}</b> is not responding\n<code>${err.message}</code>`,
      );
    } else if (prev === "unknown") {
      console.error(`[watcher] ${app.name}: ✗ unreachable on first check — ${err.message}`);
    } else {
      console.error(`[watcher] ${app.name}: ✗ still down — ${err.message}`);
    }
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────

function randomInterval() {
  return MIN_MS + Math.floor(Math.random() * (MAX_MS - MIN_MS));
}

async function tick() {
  const ts = new Date().toISOString();
  console.log(`[watcher] checking all apps and system at ${ts}`);

  await Promise.all(APPS.map(ping));
  await checkSystem();
  await warmUp();

  const next = randomInterval();
  console.log(`[watcher] next check in ${Math.round(next / 60_000)} min`);
  setTimeout(tick, next);
}

// Allow apps to finish booting before the first check
console.log(
  `[watcher] started — first check in ${STARTUP_GRACE_MS / 1000}s ` +
  `(telegram: ${TELEGRAM_TOKEN ? `enabled, thread: ${TELEGRAM_THREAD || "none"}` : "disabled"})`,
);
setTimeout(tick, STARTUP_GRACE_MS);
