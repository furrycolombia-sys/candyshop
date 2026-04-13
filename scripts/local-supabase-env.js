/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

let cachedLocalSupabaseEnv;

function parseEnvOutput(stdout) {
  const env = {};

  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (!match) continue;
    env[match[1]] = match[2];
  }

  return env;
}

function getLocalSupabaseEnv() {
  if (cachedLocalSupabaseEnv) {
    return cachedLocalSupabaseEnv;
  }

  const cwd = path.resolve(__dirname, "..");
  const result =
    process.platform === "win32"
      ? spawnSync(
          "cmd.exe",
          ["/d", "/s", "/c", "pnpm supabase status -o env"],
          { cwd, encoding: "utf8" },
        )
      : spawnSync("sh", ["-lc", "pnpm supabase status -o env"], {
          cwd,
          encoding: "utf8",
        });

  if (result.status !== 0) {
    cachedLocalSupabaseEnv = {};
    return cachedLocalSupabaseEnv;
  }

  cachedLocalSupabaseEnv = parseEnvOutput(result.stdout);
  return cachedLocalSupabaseEnv;
}

module.exports = { getLocalSupabaseEnv };
