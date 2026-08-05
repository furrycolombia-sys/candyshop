#!/usr/bin/env node
/**
 * Sync secrets from GitHub repository secrets to the local .secrets file.
 *
 * Flow:
 *   1. Generate a random one-time passphrase
 *   2. Snapshot the workflow's existing run IDs
 *   3. Trigger the sync-secrets.yml workflow via `gh workflow run`
 *   4. Poll until a run outside that snapshot completes (120s timeout)
 *   5. Download the encrypted artifact
 *   6. Decrypt with the passphrase and write .secrets
 *   7. Clean up the encrypted artifact
 *
 * Prerequisites:
 *   - `gh` CLI installed and authenticated (`gh auth status`)
 *   - Repository access with workflow dispatch permissions
 *
 * Usage:
 *   pnpm sync-secrets
 */
import { createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
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

function getCurrentBranch() {
  const result = spawnSync("git", ["branch", "--show-current"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  return result.stdout?.trim() || "main";
}

function listRuns() {
  const result = gh([
    "run",
    "list",
    "--workflow",
    WORKFLOW_FILE,
    "--limit",
    "20",
    "--json",
    "databaseId,status,conclusion",
  ]);
  if (result.status !== 0 || !result.stdout.trim()) return null;
  try {
    const runs = JSON.parse(result.stdout.trim());
    return Array.isArray(runs) ? runs : null;
  } catch {
    return null; // transient, the caller retries on the next poll
  }
}

// Snapshot the runs that already exist, so the one we are about to dispatch can
// be told apart from them. Fail rather than guess: without a baseline the poll
// below would fall back to "newest run", which is the bug this prevents.
function existingRunIds() {
  const runs = listRuns();
  if (runs === null) {
    fail(
      `Could not list runs for ${WORKFLOW_FILE}. ` +
        "Check access at: gh run list --workflow " +
        WORKFLOW_FILE,
    );
  }
  return new Set(runs.map((run) => run.databaseId));
}

function triggerWorkflow(passphrase) {
  log("Triggering sync-secrets workflow...");
  const branch = getCurrentBranch();
  log(`Using branch: ${branch}`);
  const result = gh([
    "workflow",
    "run",
    WORKFLOW_FILE,
    "--ref",
    branch,
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

async function waitForRun(knownRunIds) {
  log("Waiting for workflow to complete...");
  const startedAt = Date.now();

  while (Date.now() - startedAt < TIMEOUT_MS) {
    // Only a run that did not exist before the dispatch can be ours. Taking the
    // most recent run instead is a race: until GitHub registers the new run,
    // the newest is the *previous* sync's — already completed and successful,
    // so it is accepted immediately and its artifact downloaded. That artifact
    // was encrypted with a different one-time passphrase, so the run appears to
    // succeed and then dies at decrypt with "bad decrypt", which reads like a
    // corrupt artifact rather than the wrong run.
    const runs = listRuns();
    const run = runs?.find(
      (candidate) => !knownRunIds.has(candidate.databaseId),
    );

    if (run?.status === "completed") {
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
      `\r[sync-secrets] Workflow ${run?.status ?? "registering"}... (${elapsed}s)`,
    );

    await sleep(POLL_INTERVAL_MS);
  }

  fail(
    `Secrets workflow timed out after ${TIMEOUT_MS / 1000}s without a new run ` +
      `completing. Check the workflow runs at: gh run list --workflow ${WORKFLOW_FILE}`,
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

  try {
    const encrypted = readFileSync(encryptedPath);
    const magic = encrypted.subarray(0, 8).toString("ascii");
    if (magic !== "Salted__") {
      throw new Error("encrypted artifact is not in OpenSSL salted format");
    }

    const salt = encrypted.subarray(8, 16);
    const ciphertext = encrypted.subarray(16);
    const keyAndIv = pbkdf2Sync(passphrase, salt, 10_000, 48, "sha256");
    const key = keyAndIv.subarray(0, 32);
    const iv = keyAndIv.subarray(32, 48);
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    writeFileSync(decryptedPath, decrypted);
  } catch (err) {
    rmSync(downloadDir, { recursive: true, force: true });
    if (existsSync(decryptedPath)) unlinkSync(decryptedPath);
    fail(
      `Failed to decrypt secrets artifact: ${err.message}`,
    );
  }

  rmSync(downloadDir, { recursive: true, force: true });

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

  // Snapshot the runs that exist before dispatch
  const knownRunIds = existingRunIds();

  // Trigger workflow
  triggerWorkflow(passphrase);

  // Wait for completion
  const runId = await waitForRun(knownRunIds);

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
