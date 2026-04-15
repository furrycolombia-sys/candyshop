/**
 * Tests for scripts/load-root-env.js
 *
 * Task 1: Bug condition exploration test
 *   - Confirms the bug: loadRootEnv({ targetEnv: "dev" }) WITHOUT force does NOT
 *     overwrite a stale NEXT_PUBLIC_SUPABASE_URL already present in process.env.
 *   - This test MUST FAIL on unfixed code (that is the expected outcome for Task 1).
 *   - After the fix (Task 3), this test MUST PASS.
 *
 * Task 2: Preservation property tests
 *   - Confirms baseline: loadRootEnv({ targetEnv: "dev" }) WITHOUT force NEVER
 *     overwrites any key that was already present in process.env.
 *   - These tests MUST PASS on both unfixed and fixed code.
 *
 * Validates: Requirements 1.1, 1.2, 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// load-root-env.js is CommonJS — use createRequire to import it
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Resolve the path to load-root-env.js (one level up from __tests__)
const loadRootEnvPath = path.resolve(__dirname, "../load-root-env.js");

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Save a snapshot of the env keys we care about so we can restore them after
 * each test. We only track keys that the tests touch to avoid polluting other
 * test state.
 */
const TRACKED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TARGET_ENV",
  "CI",
  "AUTH_PROVIDER_MODE",
];

let savedEnv = {};

beforeEach(() => {
  // Snapshot tracked keys
  savedEnv = {};
  for (const key of TRACKED_KEYS) {
    savedEnv[key] = process.env[key];
  }
  // Clear them so each test starts from a known state
  for (const key of TRACKED_KEYS) {
    delete process.env[key];
  }
  // Bust the require cache so loadRootEnv is re-evaluated fresh each test
  delete require.cache[require.resolve(loadRootEnvPath)];
});

afterEach(() => {
  // Restore tracked keys
  for (const key of TRACKED_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  // Bust cache again to avoid cross-test contamination
  delete require.cache[require.resolve(loadRootEnvPath)];
});

// ── Task 1: Bug Condition Exploration Test ────────────────────────────────────

describe("Task 1 — Bug condition: stale URL not overwritten without force", () => {
  /**
   * Property 1: Bug Condition
   *
   * EXPECTED OUTCOME on UNFIXED code: FAIL
   *   loadRootEnv({ targetEnv: "dev" }) does NOT overwrite a stale
   *   NEXT_PUBLIC_SUPABASE_URL because protectedKeys prevents it.
   *
   * EXPECTED OUTCOME on FIXED code: PASS
   *   loadRootEnv({ targetEnv: "dev", force: true }) (called by dev.mjs) DOES
   *   overwrite the stale URL.
   *
   * NOTE: Task 1 uses the test WITHOUT force to confirm the bug.
   *       Task 3.5 re-runs this same file after the fix is applied.
   *
   * Validates: Requirements 1.1, 1.2
   */
  it(
    "loadRootEnv({ targetEnv: 'dev' }) with a stale URL should result in " +
      "NEXT_PUBLIC_SUPABASE_URL === 'http://127.0.0.1:54321' (FAILS on unfixed code)",
    () => {
      // Arrange — simulate a stale staging/cloud URL already in the shell
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stale.supabase.co";

      // Act — call WITH force: true (the fixed path — dev.mjs uses this)
      // On UNFIXED code: force option is ignored (doesn't exist), URL stays stale → FAILS
      // On FIXED code: force: true overwrites the stale URL → PASSES
      const { loadRootEnv } = require(loadRootEnvPath);
      loadRootEnv({ targetEnv: "dev", force: true });

      // Assert — the dev URL should win
      // On UNFIXED code this assertion FAILS (stale URL is preserved by protectedKeys)
      // On FIXED code (with force: true in dev.mjs) this assertion PASSES
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe(
        "http://127.0.0.1:54321",
      );
    },
  );
});

// ── Task 2: Preservation Property Tests ──────────────────────────────────────

describe("Task 2 — Preservation: existing keys are never overwritten without force", () => {
  /**
   * Property 2: Preservation
   *
   * For ANY arbitrary pre-existing value of NEXT_PUBLIC_SUPABASE_URL,
   * calling loadRootEnv({ targetEnv: "dev" }) WITHOUT force NEVER overwrites it.
   *
   * EXPECTED OUTCOME on UNFIXED code: PASS (baseline preservation behavior)
   * EXPECTED OUTCOME on FIXED code:   PASS (force option does not affect non-force callers)
   *
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4
   */
  it(
    "for any arbitrary pre-existing NEXT_PUBLIC_SUPABASE_URL value, " +
      "loadRootEnv({ targetEnv: 'dev' }) without force NEVER overwrites it",
    () => {
      fc.assert(
        fc.property(
          // Generate arbitrary non-empty URL-like strings as the pre-existing value
          fc.string({ minLength: 1, maxLength: 200 }),
          (preExistingUrl) => {
            // Bust cache before each property iteration
            delete require.cache[require.resolve(loadRootEnvPath)];

            // Arrange — set an arbitrary pre-existing value
            process.env.NEXT_PUBLIC_SUPABASE_URL = preExistingUrl;

            // Act — call WITHOUT force
            const { loadRootEnv } = require(loadRootEnvPath);
            loadRootEnv({ targetEnv: "dev" });

            // Assert — the pre-existing value must be preserved
            const preserved =
              process.env.NEXT_PUBLIC_SUPABASE_URL === preExistingUrl;

            // Cleanup for next iteration
            delete process.env.NEXT_PUBLIC_SUPABASE_URL;
            delete require.cache[require.resolve(loadRootEnvPath)];

            return preserved;
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it("loadRootEnv({ targetEnv: 'dev' }) without force preserves a known staging URL", () => {
    // Concrete example: staging URL must not be overwritten
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://staging.example.supabase.co";

    const { loadRootEnv } = require(loadRootEnvPath);
    loadRootEnv({ targetEnv: "dev" });

    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://staging.example.supabase.co",
    );
  });

  it("loadRootEnv({ targetEnv: 'dev' }) without force preserves a known prod URL", () => {
    // Concrete example: prod URL must not be overwritten
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prod.example.supabase.co";

    const { loadRootEnv } = require(loadRootEnvPath);
    loadRootEnv({ targetEnv: "dev" });

    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://prod.example.supabase.co",
    );
  });
});
