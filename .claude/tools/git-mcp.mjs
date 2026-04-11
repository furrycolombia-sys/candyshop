#!/usr/bin/env node
/**
 * Git MCP Server Wrapper
 *
 * Wraps @cyanheads/git-mcp-server to use GITHUB_PERSONAL_ACCESS_TOKEN from .env.local
 * for authenticated git operations (push, pull, fetch, clone).
 *
 * Tools Provided (27 total via @cyanheads/git-mcp-server):
 * - Repository: git_init, git_clone, git_status, git_clean
 * - Staging/Commits: git_add, git_commit, git_diff
 * - History: git_log, git_show, git_blame, git_reflog
 * - Branching: git_branch, git_checkout, git_merge, git_rebase, git_cherry_pick
 * - Remote Operations: git_remote, git_fetch, git_pull, git_push
 * - Advanced: git_tag, git_stash, git_reset, git_worktree, git_set_working_dir
 *
 * Authentication Strategy:
 * - Reads GITHUB_PERSONAL_ACCESS_TOKEN from .env.local or .claude/tools/.env.local
 * - Creates a GIT_ASKPASS helper script that provides the token to git
 * - Token never appears in command-line arguments (secure)
 * - Cleans up helper script on exit
 *
 * Requires GITHUB_PERSONAL_ACCESS_TOKEN in .env.local or .claude/tools/.env.local
 */
/* global process */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptDir = __dirname;
const projectRoot = path.resolve(scriptDir, "..", "..");

// Change to project root
process.chdir(projectRoot);

// Load environment variables from .env.local
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^GITHUB_PERSONAL_ACCESS_TOKEN=(.+)$/);
    if (match) {
      let token = match[1].trim();
      if (
        (token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'"))
      ) {
        token = token.slice(1, -1);
      }
      process.env.GITHUB_PERSONAL_ACCESS_TOKEN = token;
      break;
    }
  }
}

// Load token from .env.local files
loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(scriptDir, ".env.local"));

const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("Error: GITHUB_PERSONAL_ACCESS_TOKEN not found in .env.local");
  console.error("Checked locations:");
  console.error(`  - ${path.join(projectRoot, ".env.local")}`);
  console.error(`  - ${path.join(scriptDir, ".env.local")}`);
  process.exit(1);
}

// Create temporary GIT_ASKPASS helper script
const isWindows = os.platform() === "win32";
const helperScriptPath = path.join(
  os.tmpdir(),
  isWindows
    ? `git-askpass-helper-${process.pid}.bat`
    : `git-askpass-helper-${process.pid}.sh`,
);

// Create helper script content based on platform
// Use environment variable reference instead of embedding token directly
const helperScriptContent = isWindows
  ? `@echo off\necho %GITHUB_PERSONAL_ACCESS_TOKEN%`
  : `#!/bin/bash\necho "$GITHUB_PERSONAL_ACCESS_TOKEN"`;

fs.writeFileSync(helperScriptPath, helperScriptContent, { mode: 0o700 });

// Cleanup function to remove helper script
function cleanup() {
  try {
    if (fs.existsSync(helperScriptPath)) {
      fs.unlinkSync(helperScriptPath);
    }
  } catch (error) {
    console.error(`Warning: Failed to cleanup helper script: ${error.message}`);
  }
}

// Register cleanup handlers
process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

// Spawn git-mcp-server with environment configured for authentication
const gitMcpServer = spawn("npx", ["@cyanheads/git-mcp-server@latest"], {
  env: {
    ...process.env,
    // Authentication via GIT_ASKPASS (secure - no command-line exposure)
    GIT_ASKPASS: helperScriptPath,
    GIT_TERMINAL_PROMPT: "0", // Disable interactive prompts

    // MCP transport configuration
    MCP_TRANSPORT_TYPE: "stdio",
    MCP_LOG_LEVEL: process.env.MCP_LOG_LEVEL || "error",

    // Git identity (falls back to global git config if not set)
    GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || undefined,
    GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || undefined,

    // Optional: Restrict operations to project directory for security
    GIT_BASE_DIR: projectRoot,

    // Optional: Commit signing
    GIT_SIGN_COMMITS: process.env.GIT_SIGN_COMMITS || "false",
  },
  stdio: "inherit",
  cwd: projectRoot,
  shell: isWindows, // Required on Windows to find npx in PATH
});

// Handle server process events
gitMcpServer.on("error", (error) => {
  console.error(`Failed to start git-mcp-server: ${error.message}`);
  cleanup();
  process.exit(1);
});

gitMcpServer.on("exit", (code, signal) => {
  cleanup();
  if (signal) {
    console.error(`git-mcp-server was killed with signal ${signal}`);
    process.exit(1);
  } else if (code !== 0) {
    console.error(`git-mcp-server exited with code ${code}`);
    process.exit(code);
  }
});

// Forward our own exit to the child process
process.on("exit", () => {
  if (!gitMcpServer.killed) {
    gitMcpServer.kill();
  }
});
