#!/usr/bin/env node
// Builds all apps via Turborepo with the specified env loaded.
// Usage: node scripts/build.mjs --env prod
import { execSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";

const envFlag = process.argv.indexOf("--env");
const targetEnv = envFlag !== -1 ? process.argv[envFlag + 1] : "prod";
loadEnv(targetEnv);

try {
  process.env.NEXT_PUBLIC_BUILD_HASH = execSync("git rev-parse --short HEAD", {
    encoding: "utf8",
  }).trim();
} catch {
  // Not in a git repo or git unavailable — keep env file value
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";

// On Windows, turbo.CMD requires cmd.exe. Using shell:true with a quoted path
// is deprecated (DEP0190) and flagged by SAST (CWE-78). Invoke cmd.exe explicitly.
const result = isWindows
  ? spawnSync(
      "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        resolve(rootDir, "node_modules", ".bin", "turbo.CMD"),
        "build",
      ],
      { cwd: rootDir, stdio: "inherit", env: process.env, shell: false },
    )
  : spawnSync(resolve(rootDir, "node_modules", ".bin", "turbo"), ["build"], {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
    });

process.exit(result.status ?? 0);
