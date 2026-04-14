#!/usr/bin/env node
/**
 * Sync secrets from GitHub repository secrets to the local .secrets file.
 *
 * Flow:
 *   1. Generate a random one-time passphrase
 *   2. Trigger the sync-secrets.yml workflow via `gh workflow run`
 *   3. Poll for workflow completion (120s timeout)
 *   4. Download the encrypted artifact
 *   5. Decrypt with the passphrase and write .secrets
 *   6. Clean up the encrypted artifact
 *
 * Prerequisites:
 *   - `gh` CLI installed and authenticated (`gh auth status`)
 *   - Repository access with workflow dispatch permissions
 *
 * Usage:
 *   pnpm sync-secrets
 */
import { randomBytes } from "node:crypto";
import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const secretsPath = resolve(rootDir, ".secrets");
const isWindows = process.platform === "win32";

const WORKFLOW_FILE = "sync-secrets.yml";
const ARTIFACT_NAME = "secrets-encrypted";
const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 120_000;

// ── Helpers ─────────────────────────────────────────────────────

function log(msg) {
  console.log(`[sync-secrets] ${msg}`);
}

function fail(msg) {
  console.error(`[sync-secrets] ${msg}`);
  process.exit(1);
}

function gh(args, opts = {}) {
  const result = spawnSync("gh", args, {
    cwd: rootDir,
    encoding: "utf8",
    ...opts,
  });
  return result;
}

function openssl(args) {
  const bin = isWindows ? "openssl.exe" : "openssl";
  return spawnSync(bin, args, {
    cwd: rootDir,
    encoding: "utf8",
  });
}

// ── Prerequisite checks ─────────────────────────────────────────

function ensureGhCli() {
  const result = gh(["auth", "status"]);
  if (result.status !== 0) {
    fail(
      "GitHub CLI (gh) is not installed or not authenticated.\n" +
        "Install it from https://cli.github.com and run `gh auth login`.",
    );
  }
}

// ── Get repo info ───────────────────────────────────────────────

function getRepoSlug() {
  const result = gh([
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "-q",
    ".nameWithOwner",
  ]);
  if (result.status !== 0 || !result.stdout.trim()) {
    fail("Could not determine repository. Make sure you're in a GitHub repo.");
  }
  return result.stdout.trim();
}

// ── Workflow trigger and polling ────────────────────────────────

function triggerWorkflow(passphrase) {
  log("Triggering sync-secrets workflow...");
  const result = gh([
    "workflow",
    "run",
    WORKFLOW_FILE,
    "--field",
    `passphrase=${passphrase}`,
  ]);
  if (result.status !== 0) {
    fail(`Failed to trigger workflow: ${result.stderr || "unknown error"}`);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForRun() {
  log("Waiting for workflow to complete...");
  const startedAt = Date.now();

  // Give GitHub a moment to register the run
  await sleep(3_000);

  while (Date.now() - startedAt < TIMEOUT_MS) {
    const result = gh([
      "run",
      "list",
      "--workflow",
      WORKFLOW_FILE,
      "--limit",
      "1",
      "--json",
      "databaseId,status,conclusion",
    ]);

    if (result.status === 0 && result.stdout.trim()) {
      try {
        const runs = JSON.parse(result.stdout.trim());
        if (runs.length > 0) {
          const run = runs[0];
          if (run.status === "completed") {
            if (run.conclusion === "success") {
              log(`Workflow completed successfully (run ${run.databaseId}).`);
              return run.databaseId;
            }
            fail(
              `Workflow failed with conclusion: ${run.conclusion}. ` +
                `Check the run at: gh run view ${run.databaseId}`,
            );
          }
          // Still in progress
          const elapsed = Math.round((Date.now() - startedAt) / 1000);
          process.stdout.write(
            `\r[sync-secrets] Workflow ${run.status}... (${elapsed}s)`,
          );
        }
      } catch {
        // JSON parse error, retry
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  fail(
    `Secrets workflow timed out after ${TIMEOUT_MS / 1000}s. ` +
      `Check the workflow runs at: gh run list --workflow ${WORKFLOW_FILE}`,
  );
}

// ── Download and decrypt ────────────────────────────────────────

function downloadArtifact(runId) {
  log("Downloading encrypted artifact...");
  const downloadDir = resolve(rootDir, ".secrets-download");

  // Clean up any previous download
  if (existsSync(downloadDir)) {
    rmSync(downloadDir, { recursive: true, force: true });
  }

  const result = gh([
    "run",
    "download",
    String(runId),
    "--name",
    ARTIFACT_NAME,
    "--dir",
    downloadDir,
  ]);

  if (result.status !== 0) {
    fail(`Failed to download artifact: ${result.stderr || "unknown error"}`);
  }

  const encryptedPath = resolve(downloadDir, "secrets-encrypted.bin");
  if (!existsSync(encryptedPath)) {
    rmSync(downloadDir, { recursive: true, force: true });
    fail("Downloaded artifact does not contain secrets-encrypted.bin.");
  }

  return { encryptedPath, downloadDir };
}

function decryptAndWrite(encryptedPath, passphrase, downloadDir) {
  log("Decrypting secrets...");
  const decryptedPath = resolve(rootDir, ".secrets-decrypted.tmp");

  const result = openssl([
    "aes-256-cbc",
    "-d",
    "-pbkdf2",
    "-in",
    encryptedPath,
    "-out",
    decryptedPath,
    "-pass",
    `pass:${passphrase}`,
  ]);

  // Clean up download dir regardless
  rmSync(downloadDir, { recursive: true, force: true });

  if (result.status !== 0) {
    if (existsSync(decryptedPath)) unlinkSync(decryptedPath);
    fail(
      "Failed to decrypt secrets artifact. The workflow may have used a different passphrase.",
    );
  }

  // Move decrypted file to .secrets
  const content = readFileSync(decryptedPath, "utf-8");
  writeFileSync(secretsPath, content, "utf-8");
  unlinkSync(decryptedPath);

  // Count secrets written
  const secretCount = content.split("\n").filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("#") && trimmed.includes("=");
  }).length;

  return secretCount;
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  ensureGhCli();

  const repoSlug = getRepoSlug();
  log(`Repository: ${repoSlug}`);

  // Generate one-time passphrase
  const passphrase = randomBytes(32).toString("hex");

  // Trigger workflow
  triggerWorkflow(passphrase);

  // Wait for completion
  const runId = await waitForRun();

  // Download and decrypt
  const { encryptedPath, downloadDir } = downloadArtifact(runId);
  const secretCount = decryptAndWrite(encryptedPath, passphrase, downloadDir);

  console.log("");
  log(`✓ Synced ${secretCount} secrets to .secrets`);
}

main().catch((err) => {
  console.error(`[sync-secrets] ${err.message}`);
  process.exit(1);
});
