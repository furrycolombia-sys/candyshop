#!/usr/bin/env node
/**
 * Cross-platform wrapper for docker-health-check.sh
 * Finds Git's bundled sh.exe on Windows so it works from PowerShell.
 */
import { execFileSync, execSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";

let sh = "sh";

if (process.platform === "win32") {
  try {
    const gitPath = execSync("where git", { encoding: "utf-8" })
      .trim()
      .split("\n")[0]
      .trim();
    // git.exe is at .../Git/cmd/git.exe → sh.exe is at .../Git/bin/sh.exe
    const gitSh = join(dirname(dirname(gitPath)), "bin", "sh.exe");
    if (existsSync(gitSh)) sh = gitSh;
  } catch {
    // Fall back to 'sh' and hope it's in PATH
  }
}

execFileSync(sh, ["scripts/docker-health-check.sh"], { stdio: "inherit" });
