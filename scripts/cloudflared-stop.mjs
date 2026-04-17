#!/usr/bin/env node
/**
 * Stops all running Cloudflare tunnels declared in the active env file.
 *
 * Usage:
 *   node scripts/cloudflared-stop.mjs [--env <name>] [--help]
 *
 *   --env <name>   Environment to load from .env.<name> (default: prod)
 *   --help         Print this help and exit
 *
 * Examples:
 *   pnpm tunnel:stop --env staging
 *   pnpm tunnel:stop
 */

import { spawnSync } from "node:child_process";
import { loadEnv } from "./load-env.mjs";

const isWindows = process.platform === "win32";

// ── CLI arg parsing ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`
Usage: node scripts/cloudflared-stop.mjs [--env <name>] [--help]

  --env <name>   Environment to load from .env.<name> (default: prod)
  --help         Print this help and exit

Examples:
  pnpm tunnel:stop --env staging
  pnpm tunnel:stop
`);
  process.exit(0);
}

const envFlag = args.indexOf("--env");
const targetEnv = envFlag !== -1 ? args[envFlag + 1] : "prod";

// ── Load env file ─────────────────────────────────────────────────────────────

try {
  loadEnv(targetEnv);
} catch (err) {
  console.error(`ERROR: Failed to load .env.${targetEnv}: ${err.message}`);
  process.exit(1);
}

// ── Discover tunnels ──────────────────────────────────────────────────────────

const TUNNEL_ENABLED_RE = /^CLOUDFLARE_TUNNEL_(.+)_ENABLED$/;

const tunnelNames = Object.keys(process.env)
  .map((key) => {
    const match = TUNNEL_ENABLED_RE.exec(key);
    return match ? match[1] : null;
  })
  .filter(Boolean);

// ── Stop enabled tunnels ──────────────────────────────────────────────────────

for (const name of tunnelNames) {
  const enabled = process.env[`CLOUDFLARE_TUNNEL_${name}_ENABLED`];
  if (enabled !== "true") continue;

  const token = process.env[`CLOUDFLARE_TUNNEL_${name}_TOKEN`] ?? "";
  if (!token) continue;

  let result;
  if (isWindows) {
    // On Windows, kill all cloudflared.exe processes (token matching not available)
    result = spawnSync("taskkill", ["/F", "/IM", "cloudflared.exe"], {
      stdio: "pipe",
    });
  } else {
    result = spawnSync(
      "pkill",
      ["-f", `cloudflared tunnel run --token ${token}`],
      { stdio: "pipe" },
    );
  }

  if (result.status === 0) {
    console.log(`✓ Tunnel stopped: ${name}`);
  } else {
    console.log(`⚠ No running tunnel found for: ${name}`);
  }
}

process.exit(0);
