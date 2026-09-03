/**
 * Tests for scripts/load-env.mjs
 *
 * Validates:
 * - Env vars from .env.dev are loaded into process.env
 * - Pre-existing process.env values are NOT overwritten (CI/CLI wins)
 * - $secret: references are resolved from .secrets
 * - In CI mode (CI=true), unresolved $secret: refs use process.env directly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TRACKED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_PROVIDER_MODE",
  "CI",
  "TARGET_ENV",
];

let savedEnv = {};

beforeEach(() => {
  savedEnv = {};
  for (const key of TRACKED_KEYS) savedEnv[key] = process.env[key];
  for (const key of TRACKED_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of TRACKED_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

async function freshLoadEnv(targetEnv) {
  // A fresh module each call, because loadEnv memoises what it has read.
  //
  // This used to bust the cache with `import(\`../load-env.mjs?t=${Date.now()}\`)`,
  // which vite cannot statically analyse -- it fails with "Unknown variable
  // dynamic import" and took the whole file down with it. That is why this
  // file was excluded from `test:workflows` rather than fixed.
  // vi.resetModules() is vitest's own answer to the same problem and needs no
  // dynamic specifier at all.
  vi.resetModules();
  const { loadEnv } = await import("../load-env.mjs");
  loadEnv(targetEnv);
}

describe("loadEnv — existing keys are never overwritten", () => {
  it("for any pre-existing NEXT_PUBLIC_SUPABASE_URL, loadEnv never overwrites it", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (preExistingUrl) => {
          process.env.NEXT_PUBLIC_SUPABASE_URL = preExistingUrl;
          await freshLoadEnv("dev");
          const preserved =
            process.env.NEXT_PUBLIC_SUPABASE_URL === preExistingUrl;
          delete process.env.NEXT_PUBLIC_SUPABASE_URL;
          return preserved;
        },
      ),
      { numRuns: 50 },
    );
  });

  it("preserves a known staging URL", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://staging.example.supabase.co";
    await freshLoadEnv("dev");
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://staging.example.supabase.co",
    );
  });

  it("preserves a known prod URL", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prod.example.supabase.co";
    await freshLoadEnv("dev");
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://prod.example.supabase.co",
    );
  });
});

describe("loadEnv — loads non-secret values from .env.dev", () => {
  it("sets AUTH_PROVIDER_MODE from .env.dev when not pre-set", async () => {
    await freshLoadEnv("dev");
    expect(process.env.AUTH_PROVIDER_MODE).toBe("supabase");
  });

  it("sets NEXT_PUBLIC_SUPABASE_URL from .env.dev when not pre-set", async () => {
    await freshLoadEnv("dev");
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy();
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toMatch(/^https?:\/\//);
  });
});

describe("loadEnv — CI mode uses process.env for secrets", () => {
  it("in CI mode, uses process.env value for secret refs instead of .secrets", async () => {
    // In CI mode the loader validates EVERY $secret: reference in the file,
    // not just the one under test, so all of them have to be present. Read
    // from .env.dev rather than listed here: the list was hardcoded, .env.dev
    // gained Clerk references, and this test broke on a name it had never
    // heard of.
    const envDev = readFileSync(resolve(__dirname, "../../.env.dev"), "utf-8");
    const refs = [...envDev.matchAll(/\$secret:([A-Z0-9_]+)/g)].map(
      (m) => m[1],
    );
    const placeholders = Object.fromEntries(
      refs.map((name) => [name, `ci-${name.toLowerCase()}`]),
    );

    process.env.CI = "true";
    for (const [name, value] of Object.entries(placeholders)) {
      process.env[name] = value;
    }

    // Pick the key under test from the file too. This asserted on
    // NEXT_PUBLIC_SUPABASE_ANON_KEY, which stopped being a $secret: reference
    // when .env.dev switched to a local Supabase with its demo keys inline --
    // so the test was checking that a literal resolved from process.env, which
    // it never will.
    const pair = envDev
      .split("\n")
      .map((line) => line.match(/^([A-Z0-9_]+)=\$secret:([A-Z0-9_]+)$/))
      .find(Boolean);
    expect(
      pair,
      ".env.dev has no $secret: reference left to test",
    ).toBeTruthy();
    const [, publicKey, secretName] = pair;

    // loadEnv never overwrites a key already in process.env -- that is what
    // the first describe block asserts -- so the key under test has to start
    // absent, or this measures the ambient shell instead of the loader.
    const previous = process.env[publicKey];
    delete process.env[publicKey];

    try {
      await freshLoadEnv("dev");
      expect(process.env[publicKey]).toBe(placeholders[secretName]);
    } finally {
      for (const name of refs) delete process.env[name];
      if (previous === undefined) delete process.env[publicKey];
      else process.env[publicKey] = previous;
    }
  });
});
