/**
 * Supabase command wrapper — ensures the correct TARGET_ENV is loaded before
 * spawning any `supabase` CLI command, so config.toml env() references always
 * resolve to the right values (e.g. SUPABASE_AUTH_EXTERNAL_REDIRECT_URI).
 *
 * Usage (via package.json scripts):
 *   node scripts/supabase-cmd.mjs start
 *   node scripts/supabase-cmd.mjs stop
 *   node scripts/supabase-cmd.mjs stop --no-backup
 *   node scripts/supabase-cmd.mjs db reset
 *
 * TARGET_ENV defaults to "dev". Pass TARGET_ENV=staging etc. to override.
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadRootEnv } = require("./load-root-env.js");

loadRootEnv({ targetEnv: process.env.TARGET_ENV || "dev", force: true });

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";

// Forward all CLI args after the script name to the supabase binary
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
