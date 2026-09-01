import { spawn } from "node:child_process";
import { loadEnv } from "./scripts/load-env.mjs";
await loadEnv("dev");
spawn("pnpm", ["--filter", "landing", "start"], { stdio: "inherit", shell: true, env: process.env });
