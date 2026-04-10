import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadRootEnv } = require("./load-root-env.js");

loadRootEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const pnpmBin = isWindows ? "pnpm.cmd" : "pnpm";
const defaultCloudflaredBin = process.env.CLOUDFLARED_BIN?.trim()
  ? process.env.CLOUDFLARED_BIN.trim()
  : isWindows
    ? "cloudflared.exe"
    : "cloudflared";

const args = new Set(process.argv.slice(2));
const wantsCloudflare = args.has("--cloudflare");
const wantsHelp = args.has("--help") || args.has("-h");

if (wantsHelp) {
  console.log(`Usage:
  pnpm site:up
  pnpm site:up:cloudflare

Environment for Cloudflare:
  CLOUDFLARED_BIN=cloudflared
  CLOUDFLARE_TUNNEL_TOKEN=...
  CLOUDFLARE_TUNNEL_NAME=...
  CLOUDFLARED_ARGS="tunnel run my-tunnel"

Priority:
  1. CLOUDFLARED_ARGS
  2. CLOUDFLARE_TUNNEL_TOKEN
  3. CLOUDFLARE_TUNNEL_NAME`);
  process.exit(0);
}

function log(message) {
  console.log(`[site-up] ${message}`);
}

function runSync(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
}

function getCloudflareCommand() {
  const rawArgs = process.env.CLOUDFLARED_ARGS?.trim();
  if (rawArgs) {
    return {
      command: defaultCloudflaredBin,
      args: rawArgs.split(/\s+/),
      description: `${defaultCloudflaredBin} ${rawArgs}`,
    };
  }

  const token = process.env.CLOUDFLARE_TUNNEL_TOKEN?.trim();
  if (token) {
    return {
      command: defaultCloudflaredBin,
      args: ["tunnel", "run", "--token", token],
      description: `${defaultCloudflaredBin} tunnel run --token *****`,
    };
  }

  const tunnelName = process.env.CLOUDFLARE_TUNNEL_NAME?.trim();
  if (tunnelName) {
    return {
      command: defaultCloudflaredBin,
      args: ["tunnel", "run", tunnelName],
      description: `${defaultCloudflaredBin} tunnel run ${tunnelName}`,
    };
  }

  return null;
}

function killChild(child) {
  if (!child?.pid) return;

  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

const localUrls = [
  process.env.NEXT_PUBLIC_AUTH_URL,
  process.env.NEXT_PUBLIC_STORE_URL,
  process.env.NEXT_PUBLIC_LANDING_URL,
  process.env.NEXT_PUBLIC_PAYMENTS_URL,
  process.env.NEXT_PUBLIC_ADMIN_URL,
  process.env.NEXT_PUBLIC_STUDIO_URL,
  process.env.NEXT_PUBLIC_PLAYGROUND_URL,
].filter(Boolean);

log("Starting Supabase...");
const supabaseResult = runSync(pnpmBin, ["supabase:start"]);
if (supabaseResult.status !== 0) {
  process.exit(supabaseResult.status ?? 1);
}

log("Starting apps with `pnpm dev`...");
const children = [];

const devChild = spawn(pnpmBin, ["dev"], {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env,
});
children.push(devChild);

if (wantsCloudflare) {
  const cloudflareCommand = getCloudflareCommand();
  if (!cloudflareCommand) {
    log(
      "Cloudflare requested but no tunnel config was found. Set CLOUDFLARED_ARGS, CLOUDFLARE_TUNNEL_TOKEN, or CLOUDFLARE_TUNNEL_NAME.",
    );
    killChild(devChild);
    process.exit(1);
  }

  log(`Starting Cloudflare tunnel: ${cloudflareCommand.description}`);
  const cloudflareChild = spawn(
    cloudflareCommand.command,
    cloudflareCommand.args,
    {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
    },
  );
  children.push(cloudflareChild);
}

log("Expected URLs:");
for (const url of localUrls) {
  log(`  ${url}`);
}

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    killChild(child);
  }
  process.exit(exitCode);
}

for (const child of children) {
  child.on("exit", (code) => {
    if (shuttingDown) return;
    log(`Process ${child.pid} exited with code ${code ?? 0}`);
    shutdown(code ?? 0);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
