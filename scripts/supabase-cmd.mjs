#!/usr/bin/env node
// Thin wrapper to run any `supabase` CLI command from the monorepo root.
// Usage: node scripts/supabase-cmd.mjs start | stop | db reset | ...
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";

const supabaseArgs = process.argv.slice(2);

const result = spawnSync(
  isWindows ? "pnpm.cmd" : "pnpm",
  ["supabase", ...supabaseArgs],
  {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
    shell: isWindows,
  },
);

process.exit(result.status ?? 0);
