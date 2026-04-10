import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadRootEnv } = require("./load-root-env.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const envExamplePath = resolve(rootDir, ".env.example");
const envPath = resolve(rootDir, ".env");

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.trim();
    const nextValue = argv[index + 1];
    const hasSeparateValue =
      inlineValue === undefined &&
      nextValue !== undefined &&
      !nextValue.startsWith("--");
    const value = inlineValue ?? (hasSeparateValue ? nextValue : true);

    if (hasSeparateValue) {
      index += 1;
    }

    result[key] = value;
  }

  return result;
}

function log(message) {
  console.log(`[setup-cloudflare] ${message}`);
}

function fail(message) {
  console.error(`[setup-cloudflare] ${message}`);
  process.exit(1);
}

function ensureCommand(command) {
  const shell = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(shell, [command], { stdio: "ignore" });
  return result.status === 0;
}

function readEnvFile(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/);
}

function upsertEnvLine(lines, key, value) {
  const serialized = `${key}=${value ?? ""}`;
  const index = lines.findIndex((line) => line.startsWith(`${key}=`));

  if (index >= 0) {
    lines[index] = serialized;
    return;
  }

  lines.push(serialized);
}

function normalizeValue(value) {
  if (value == null) return "";
  return String(value).trim();
}

const args = parseArgs(process.argv.slice(2));
const wantsHelp = Boolean(args.help || args.h);

if (wantsHelp) {
  console.log(`Usage:
  pnpm setup:cloudflare --token <token>
  pnpm setup:cloudflare --name <tunnel-name>
  pnpm setup:cloudflare --args "tunnel run my-tunnel"

Optional:
  --bin <cloudflared-binary>
  --landing-url <url>
  --store-url <url>
  --auth-url <url>
  --payments-url <url>
  --admin-url <url>
  --studio-url <url>
  --playground-url <url>

This script:
  1. Creates .env from .env.example if needed
  2. Stores Cloudflare tunnel settings in .env
  3. Can update public NEXT_PUBLIC_* URLs for a recovered machine
  4. Validates required local commands`);
  process.exit(0);
}

if (!ensureCommand("pnpm")) {
  fail("`pnpm` is not installed or not available in PATH.");
}

const requestedBin = normalizeValue(args.bin) || process.env.CLOUDFLARED_BIN;
const cloudflaredBin =
  requestedBin || (process.platform === "win32" ? "cloudflared.exe" : "cloudflared");

if (!ensureCommand(cloudflaredBin)) {
  fail(
    `\`${cloudflaredBin}\` is not installed or not available in PATH. Install Cloudflare Tunnel first.`,
  );
}

if (!existsSync(envPath)) {
  writeFileSync(envPath, readFileSync(envExamplePath, "utf8"), "utf8");
  log("Created `.env` from `.env.example`.");
}

loadRootEnv();

const token = normalizeValue(args.token) || process.env.CLOUDFLARE_TUNNEL_TOKEN;
const name = normalizeValue(args.name) || process.env.CLOUDFLARE_TUNNEL_NAME;
const tunnelArgs = normalizeValue(args.args) || process.env.CLOUDFLARED_ARGS;

if (!token && !name && !tunnelArgs) {
  fail(
    "Provide one of `--token`, `--name`, or `--args` so the tunnel can be restored after formatting the machine.",
  );
}

const lines = readEnvFile(envPath);

upsertEnvLine(lines, "CLOUDFLARED_BIN", cloudflaredBin);

if (token) upsertEnvLine(lines, "CLOUDFLARE_TUNNEL_TOKEN", token);
if (name) upsertEnvLine(lines, "CLOUDFLARE_TUNNEL_NAME", name);
if (tunnelArgs) upsertEnvLine(lines, "CLOUDFLARED_ARGS", tunnelArgs);

const publicUrlMap = {
  "landing-url": "NEXT_PUBLIC_LANDING_URL",
  "store-url": "NEXT_PUBLIC_STORE_URL",
  "auth-url": "NEXT_PUBLIC_AUTH_URL",
  "payments-url": "NEXT_PUBLIC_PAYMENTS_URL",
  "admin-url": "NEXT_PUBLIC_ADMIN_URL",
  "studio-url": "NEXT_PUBLIC_STUDIO_URL",
  "playground-url": "NEXT_PUBLIC_PLAYGROUND_URL",
};

for (const [argKey, envKey] of Object.entries(publicUrlMap)) {
  const value = normalizeValue(args[argKey]);
  if (value) {
    upsertEnvLine(lines, envKey, value);
  }
}

writeFileSync(envPath, `${lines.join("\n").trim()}\n`, "utf8");

log("Saved Cloudflare recovery settings to `.env`.");
log("Recovery flow for a fresh machine:");
log("  1. pnpm install");
log("  2. pnpm setup:cloudflare --help  (optional reference)");
log("  3. pnpm site:up:cloudflare");
