import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadRootEnv } = require("./load-root-env.js");

loadRootEnv({ targetEnv: "dev", force: true });

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";

// On Windows, .cmd files must be invoked via shell. Pass the full command as a
// string (not an array) to avoid the DEP0190 args-concatenation warning.
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
