/**
 * Tests for .github/workflows/sync-secrets.yml
 *
 * This workflow produces the ONLY backup of secrets that GitHub itself stores
 * write-only — including the production SSH key and WEBHOOK_SECRET. When it is
 * wrong, nothing fails loudly: the sync reports success and writes a file that
 * silently lacks whatever was missed. Both bugs it has had were of that shape.
 *
 *   1. Drift. Secrets were named twice (env: and the output block) and the two
 *      diverged: 17 of 64 were never written. GCP_PROD_SERVER_SSH_KEY was read
 *      into env: and then never echoed.
 *
 *   2. toJSON(secrets). The fix for (1) removed the list entirely, but GitHub
 *      rejects such a run outright — zero jobs, conclusion action_required, and
 *      not approvable. It only shows up after the workflow is merged and
 *      dispatched, so nothing local caught it.
 *
 * Strategy: assert the static shape, then EXTRACT THE REAL SHELL SCRIPT from
 * the workflow and execute it against synthetic S_* variables. The script under
 * test is the one that ships — it cannot drift from this test the way the two
 * hand-kept lists drifted from each other.
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(import.meta.url), "../../..");
const workflowPath = join(repoRoot, ".github/workflows/sync-secrets.yml");
const workflow = readFileSync(workflowPath, "utf8");

/** Windows temp dirs can refuse deletion; that is not a test failure. */
function cleanup(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* EPERM on Windows — the OS reclaims temp itself */
  }
}

/**
 * Whether bash can actually run the extracted script.
 *
 * `bash` alone is not enough to check: on Windows PATH it is usually WSL's
 * C:\WINDOWS\system32\bash.exe, which runs fine but cannot read Windows temp
 * paths — the exec tests would then fail for reasons that have nothing to do
 * with the workflow. Probe for a bash that can read a file where the tests
 * actually write, and skip honestly when there is not one. CI is Linux, so
 * these never skip where it counts.
 */
function bashUsable() {
  let dir;
  try {
    dir = mkdtempSync(join(tmpdir(), "bash-probe-"));
    const probe = join(dir, "probe");
    writeFileSync(probe, "ok\n");
    const res = spawnSync(
      "bash",
      ["-c", `cat "${probe.replace(/\\/g, "/")}"`],
      {
        encoding: "utf8",
      },
    );
    return res.status === 0 && res.stdout.trim() === "ok";
  } catch {
    return false;
  } finally {
    if (dir) cleanup(dir);
  }
}

const hasBash = bashUsable();

// ─────────────────────────────────────────────────────────────────────────────
// Extraction — no YAML dependency, so this test adds no packages
// ─────────────────────────────────────────────────────────────────────────────

/** `S_NAME: ${{ secrets.NAME }}` lines from the env: block. */
function envEntries(src) {
  const entries = [];
  for (const line of src.split("\n")) {
    const m =
      /^\s+S_([A-Z0-9_]+):\s*\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}\s*$/.exec(
        line,
      );
    if (m) entries.push({ prefixed: m[1], secret: m[2] });
  }
  return entries;
}

/** The first step's `run: |` block, dedented to column zero. */
function runScript(src) {
  const start = src.indexOf("        run: |");
  const after = src.indexOf("      - name: Encrypt secrets file");
  const body = src.slice(start + "        run: |\n".length, after);
  return body
    .split("\n")
    .map((l) => l.replace(/^ {10}/, ""))
    .join("\n");
}

/** Run the extracted script in a scratch dir with the given S_* vars. */
function runWith(vars) {
  const dir = mkdtempSync(join(tmpdir(), "sync-secrets-"));
  try {
    const script = join(dir, "step.sh");
    writeFileSync(script, runScript(workflow));
    const res = spawnSync("bash", ["-e", script.replace(/\\/g, "/")], {
      cwd: dir,
      encoding: "utf8",
      env: { PATH: process.env.PATH, ...vars },
    });
    let output = "";
    try {
      output = readFileSync(join(dir, "secrets-plain.txt"), "utf8");
    } catch {
      /* the guard may have exited before writing */
    }
    return { ...res, output };
  } finally {
    cleanup(dir);
  }
}

function parse(output) {
  const map = new Map();
  for (const line of output.split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("sync-secrets workflow: static shape", () => {
  it("does not use toJSON(secrets) in an expression", () => {
    // Regression guard. Runs 31200831010 and 31200881938 were rejected with
    // zero jobs on sha 0d9e785 because of this. Mentioning it in a comment is
    // fine; evaluating it is not.
    const expressions = workflow.match(/\$\{\{[^}]*\}\}/g) ?? [];
    const offenders = expressions.filter((e) =>
      /toJSON\s*\(\s*secrets\s*\)/.test(e),
    );
    expect(offenders).toEqual([]);
  });

  it("maps every S_ variable to the secret of the same name", () => {
    const entries = envEntries(workflow);
    const mismatched = entries.filter((e) => e.prefixed !== e.secret);
    expect(mismatched).toEqual([]);
  });

  it("declares no duplicate secrets", () => {
    const names = envEntries(workflow).map((e) => e.secret);
    expect(names.length).toBe(new Set(names).size);
  });

  it("still declares a plausible number of secrets", () => {
    // Not an inventory — a floor. A large silent drop is the failure mode that
    // went unnoticed for months.
    expect(envEntries(workflow).length).toBeGreaterThanOrEqual(50);
  });

  it.runIf(process.env.CI)("does not skip the exec tests in CI", () => {
    // The exec block skips where bash cannot reach the temp dir (Windows, where
    // `bash` is usually WSL's). That is fine locally and must never happen on
    // CI, or the gate silently degrades to static checks only.
    expect(hasBash).toBe(true);
  });

  it("keeps the credentials whose loss would be unrecoverable", () => {
    const names = new Set(envEntries(workflow).map((e) => e.secret));
    for (const critical of [
      "PROD_SERVER_SSH_KEY",
      "GCP_PROD_SERVER_SSH_KEY",
      "WEBHOOK_SECRET",
      "PROD_SUPABASE_SERVICE_ROLE_KEY",
    ]) {
      expect(names.has(critical), `${critical} missing from env:`).toBe(true);
    }
  });
});

describe.skipIf(!hasBash)("sync-secrets workflow: the shipped script", () => {
  it("writes every S_ variable it is given", () => {
    const vars = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`S_SECRET_${i}`, `value-${i}`]),
    );
    const { status, output } = runWith(vars);
    expect(status).toBe(0);

    const written = parse(output);
    for (const key of Object.keys(vars)) {
      const name = key.slice(2);
      expect(written.get(name), `${name} not written`).toBe(vars[key]);
    }
  });

  it("base64-encodes multi-line values and round-trips them exactly", () => {
    const pem =
      "-----BEGIN OPENSSH PRIVATE KEY-----\nabc\ndef\n-----END OPENSSH PRIVATE KEY-----\n";
    const vars = Object.fromEntries(
      Array.from({ length: 11 }, (_, i) => [`S_FILLER_${i}`, `v${i}`]),
    );
    vars.S_PROD_SERVER_SSH_KEY = pem;

    const { status, output } = runWith(vars);
    expect(status).toBe(0);

    const written = parse(output);
    // The raw name must NOT appear — it would corrupt the one-per-line format.
    expect(written.has("PROD_SERVER_SSH_KEY")).toBe(false);

    const encoded = written.get("PROD_SERVER_SSH_KEY_BASE64");
    expect(encoded).toBeTruthy();
    expect(encoded).not.toMatch(/\s/);
    expect(Buffer.from(encoded, "base64").toString("utf8")).toBe(pem);
  });

  it("emits empty secrets rather than dropping them", () => {
    const vars = Object.fromEntries(
      Array.from({ length: 11 }, (_, i) => [`S_FILLER_${i}`, `v${i}`]),
    );
    vars.S_UNSET_ONE = "";

    const { status, output } = runWith(vars);
    expect(status).toBe(0);
    expect(parse(output).has("UNSET_ONE")).toBe(true);
    expect(parse(output).get("UNSET_ONE")).toBe("");
  });

  it("refuses to write a truncated backup", () => {
    // The file overwrites a good local .secrets, so writing a short one is
    // worse than writing nothing.
    const { status, stdout } = runWith({ S_ONLY_ONE: "x" });
    expect(status).not.toBe(0);
    expect(stdout).toContain("refusing to publish a truncated backup");
  });

  it("ignores environment variables that are not secrets", () => {
    const vars = Object.fromEntries(
      Array.from({ length: 11 }, (_, i) => [`S_FILLER_${i}`, `v${i}`]),
    );
    vars.NOT_A_SECRET = "leak-me";
    vars.HOME_ISH = "also-not";

    const { status, output } = runWith(vars);
    expect(status).toBe(0);
    expect(output).not.toContain("leak-me");
    expect(output).not.toContain("also-not");
  });
});
