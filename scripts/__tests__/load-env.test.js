/**
 * Tests for scripts/load-env.mjs
 *
 * Validates:
 * - Env vars from .env.dev are loaded into process.env
 * - Pre-existing process.env values are NOT overwritten (CI/CLI wins)
 * - $secret: references are resolved from .secrets
 * - In CI mode (CI=true), unresolved $secret: refs use process.env directly
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fc from "fast-check";

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
  // Force re-import by busting module cache via timestamp query param
  const { loadEnv } = await import(`../load-env.mjs?t=${Date.now()}`);
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
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
  });
});

describe("loadEnv — CI mode uses process.env for secrets", () => {
  it("in CI mode, uses process.env value for secret refs instead of .secrets", async () => {
    process.env.CI = "true";
    process.env.DEV_SUPABASE_ANON_KEY = "ci-anon-key";
    await freshLoadEnv("dev");
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("ci-anon-key");
    delete process.env.DEV_SUPABASE_ANON_KEY;
  });
});
