#!/usr/bin/env node
/**
 * Runs the database integration suite against THIS project's Supabase.
 *
 * The env must be loaded first. Without it the helpers fall back to the
 * Supabase CLI's default base port, and on a machine running more than one
 * local Supabase that is somebody else's database -- the suite would either
 * fail confusingly or, worse, pass against the wrong schema.
 *
 * Usage: node scripts/test-db.mjs [--env <name>] [-- <vitest args>]
 */
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv } from "./load-env.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const envFlag = args.indexOf("--env");
const targetEnv = envFlag === -1 ? "dev" : args[envFlag + 1];

await loadEnv(targetEnv);

const passthrough = args.filter(
  (a, i, all) => a !== "--env" && all[i - 1] !== "--env",
);

console.log(
  `\ndatabase tests  env=${targetEnv}  supabase api port=${process.env.SUPABASE_PORT ?? "54321"}\n`,
);

const child = spawn(
  "pnpm",
  [
    "exec",
    "vitest",
    "run",
    "-c",
    "vitest.config.integration.ts",
    ...passthrough,
  ],
  { cwd: rootDir, stdio: "inherit", shell: true, env: process.env },
);
child.on("exit", (code) => process.exit(code ?? 0));
