/**
 * Drift guard for scripts/load-root-env.cjs vs scripts/load-env.mjs.
 *
 * load-root-env.cjs is a self-contained CJS reimplementation of load-env.mjs
 * (NOT a delegation — see the docstring in load-root-env.cjs for why it can't
 * be: Playwright loads it through a synchronous pirates/babel CJS-transform
 * require chain that breaks if an ESM module is pulled into it).
 *
 * Two independent implementations of the same contract WILL drift unless
 * something asserts they still agree. This test is that something. It runs
 * both loaders against identical fixtures and asserts identical outcomes for
 * the three cases that matter most:
 *   1. $secret: reference resolves to a real value (CI and local paths)
 *   2. $secret: reference is missing in CI          -> both must throw,
 *      naming the same variable
 *   3. $secret: reference is missing locally (not in .secrets) -> both must
 *      throw, naming the same variable
 *
 * If you change $secret: resolution or CI-strictness behavior in either
 * load-env.mjs or load-root-env.cjs, mirror the change in the other file.
 * This test failing is the signal that you didn't.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { loadEnv } from "../load-env.mjs";
import { loadRootEnv } from "../load-root-env.cjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..", "..");

// Use the "test" env slot (.env.test) — it's an allowed env name in both
// loaders but has no real committed file, so we can freely create/delete it.
const ENV_NAME = "test";
const ENV_FILE = resolve(rootDir, ".env.test");
const SECRETS_FILE = resolve(rootDir, ".secrets");
const SECRET_VAR_NAME = "LOAD_ROOT_ENV_EQUIVALENCE_TEST_SECRET";

const TRACKED_PROCESS_ENV_KEYS = [
  "CI",
  "TARGET_ENV",
  "MY_TEST_VALUE",
  SECRET_VAR_NAME,
];

let envFileBackup; // undefined = file didn't exist before the test
let secretsFileBackup; // undefined = file didn't exist before the test
let savedProcessEnv = {};

function backupFile(path) {
  return existsSync(path) ? readFileSync(path, "utf-8") : undefined;
}

function restoreFile(path, backup) {
  if (backup === undefined) {
    if (existsSync(path)) unlinkSync(path);
  } else {
    writeFileSync(path, backup);
  }
}

beforeEach(() => {
  envFileBackup = backupFile(ENV_FILE);
  secretsFileBackup = backupFile(SECRETS_FILE);

  savedProcessEnv = {};
  for (const key of TRACKED_PROCESS_ENV_KEYS)
    savedProcessEnv[key] = process.env[key];
  for (const key of TRACKED_PROCESS_ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  restoreFile(ENV_FILE, envFileBackup);
  restoreFile(SECRETS_FILE, secretsFileBackup);

  for (const key of TRACKED_PROCESS_ENV_KEYS) {
    if (savedProcessEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedProcessEnv[key];
  }
});

// Runs both loaders against the current fixtures/process.env and returns a
// normalized outcome for comparison — either the resulting env var value, or
// the thrown error's message.
function runBoth() {
  const outcomes = {};

  for (const [label, run] of [
    ["mjs", () => loadEnv(ENV_NAME)],
    ["cjs", () => loadRootEnv({ targetEnv: ENV_NAME })],
  ]) {
    delete process.env.MY_TEST_VALUE;
    delete process.env.TARGET_ENV;
    try {
      run();
      outcomes[label] = { threw: false, value: process.env.MY_TEST_VALUE };
    } catch (err) {
      outcomes[label] = { threw: true, message: err.message };
    }
  }

  return outcomes;
}

describe("load-root-env.cjs vs load-env.mjs — equivalence", () => {
  it("both resolve a $secret: reference present in CI process.env identically", () => {
    writeFileSync(ENV_FILE, `MY_TEST_VALUE=$secret:${SECRET_VAR_NAME}\n`);
    process.env.CI = "true";
    process.env[SECRET_VAR_NAME] = "resolved-in-ci";

    const { mjs, cjs } = runBoth();

    expect(mjs).toEqual({ threw: false, value: "resolved-in-ci" });
    expect(cjs).toEqual({ threw: false, value: "resolved-in-ci" });
  });

  it("both resolve a $secret: reference present in .secrets identically", () => {
    writeFileSync(ENV_FILE, `MY_TEST_VALUE=$secret:${SECRET_VAR_NAME}\n`);
    // CI unset -> local (.secrets) branch
    const baseSecrets = secretsFileBackup ?? "";
    writeFileSync(
      SECRETS_FILE,
      `${baseSecrets}\n${SECRET_VAR_NAME}=resolved-locally\n`,
    );

    const { mjs, cjs } = runBoth();

    expect(mjs).toEqual({ threw: false, value: "resolved-locally" });
    expect(cjs).toEqual({ threw: false, value: "resolved-locally" });
  });

  it("both throw naming the variable when the secret is missing in CI", () => {
    writeFileSync(ENV_FILE, `MY_TEST_VALUE=$secret:${SECRET_VAR_NAME}\n`);
    process.env.CI = "true";
    // Deliberately do NOT set process.env[SECRET_VAR_NAME]

    const { mjs, cjs } = runBoth();

    expect(mjs.threw).toBe(true);
    expect(cjs.threw).toBe(true);
    expect(mjs.message).toContain(SECRET_VAR_NAME);
    expect(cjs.message).toContain(SECRET_VAR_NAME);
    expect(mjs.message).toMatch(/Missing secret in CI/);
    expect(cjs.message).toMatch(/Missing secret in CI/);

    // This is the exact regression this test exists to prevent: a missing
    // CI secret must throw, never silently resolve to "".
    expect(mjs.value).not.toBe("");
    expect(cjs.value).not.toBe("");
  });

  it("both throw naming the variable when the secret is missing locally", () => {
    writeFileSync(ENV_FILE, `MY_TEST_VALUE=$secret:${SECRET_VAR_NAME}\n`);
    // CI unset -> local (.secrets) branch. Ensure a .secrets file exists but
    // does NOT contain SECRET_VAR_NAME, so both loaders hit the
    // "Missing secret" branch rather than "Missing .secrets file".
    const baseSecrets = (secretsFileBackup ?? "").replace(
      new RegExp(`^${SECRET_VAR_NAME}=.*$`, "m"),
      "",
    );
    writeFileSync(SECRETS_FILE, baseSecrets || "PLACEHOLDER=1\n");

    const { mjs, cjs } = runBoth();

    expect(mjs.threw).toBe(true);
    expect(cjs.threw).toBe(true);
    expect(mjs.message).toContain(SECRET_VAR_NAME);
    expect(cjs.message).toContain(SECRET_VAR_NAME);
    expect(mjs.message).toMatch(/Missing secret:/);
    expect(cjs.message).toMatch(/Missing secret:/);
  });
});
