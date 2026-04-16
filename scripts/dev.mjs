#!/usr/bin/env node
// Starts all apps in dev mode via Turborepo.
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";

const child = isWindows
  ? spawn(
      `"${resolve(rootDir, "node_modules", ".bin", "turbo.cmd")}" dev`,
      [],
      { cwd: rootDir, stdio: "inherit", env: process.env, shell: true },
    )
  : spawn(resolve(rootDir, "node_modules", ".bin", "turbo"), ["dev"], {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
    });

child.on("exit", (code) => process.exit(code ?? 0));
