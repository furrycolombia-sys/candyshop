#!/usr/bin/env node
// Runs any supabase CLI command with env loaded.
// Usage: node scripts/supabase-cmd.mjs start | stop | db reset | ...
// Usage with env: node scripts/supabase-cmd.mjs --env staging start
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";

const envFlag = process.argv.indexOf("--env");
const targetEnv = envFlag !== -1 ? process.argv[envFlag + 1] : "dev";
loadEnv(targetEnv);

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";

// Strip --env <name> before forwarding args to supabase
const supabaseArgs = process.argv.slice(2).filter((a, i, arr) =>
  a !== "--env" && arr[i - 1] !== "--env"
);

const result = spawnSync(
  isWindows ? "pnpm.cmd" : "pnpm",
  ["supabase", ...supabaseArgs],
  { cwd: rootDir, stdio: "inherit", env: process.env, shell: isWindows },
);

process.exit(result.status ?? 0);
