/**
 * Property-based tests for appUrls.ts
 * Feature: app-navigation-origins
 *
 * Uses fast-check to verify URL derivation properties hold across all valid inputs.
 * Each property runs a minimum of 100 iterations.
 */
import * as fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stripTrailingSlash } from "@shared/utils/url";

// All app names and their expected path segments (from app-links.json)
const APP_PATHS: Record<string, string> = {
  landing: "/",
  store: "/store",
  studio: "/studio",
  payments: "/payments",
  admin: "/admin",
  auth: "/auth",
  playground: "/playground",
};

/** Clear all app-URL env vars so the module falls back to defaults. */
function clearAppUrlEnvVars() {
  vi.stubEnv("APP_PUBLIC_ORIGIN", "");
  vi.stubEnv("NEXT_PUBLIC_LANDING_URL", "");
  vi.stubEnv("NEXT_PUBLIC_STORE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_STUDIO_URL", "");
  vi.stubEnv("NEXT_PUBLIC_PAYMENTS_URL", "");
  vi.stubEnv("NEXT_PUBLIC_ADMIN_URL", "");
  vi.stubEnv("NEXT_PUBLIC_AUTH_URL", "");
  vi.stubEnv("NEXT_PUBLIC_PLAYGROUND_URL", "");
}

async function importFreshAppUrls() {
  vi.resetModules();
  const mod = await import("./appUrls");
  return mod.appUrls;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/**
 * Arbitrary that generates valid HTTP/HTTPS origins:
 * scheme + host (+ optional port), no trailing slash.
 * Pattern: http(s)://[a-z][a-z0-9-]*(.[a-z][a-z0-9-]*)*(:[0-9]{1,5})?
 */
const hostnameLabel = fc.stringMatching(/^[a-z][a-z0-9-]{0,7}$/);

const validOriginArb = fc
  .tuple(
    fc.constantFrom("http", "https"),
    // hostname: one or more dot-separated labels
    fc
      .array(hostnameLabel, { minLength: 1, maxLength: 3 })
      .map((labels) => labels.join(".")),
    // optional port
    fc.option(fc.integer({ min: 1, max: 65_535 }), { nil: null }),
  )
  .map(([scheme, host, port]) =>
    port === null ? `${scheme}://${host}` : `${scheme}://${host}:${port}`,
  );

// ─────────────────────────────────────────────────────────────────────────────
// Property 1: APP_PUBLIC_ORIGIN produces same URLs as SITE_PUBLIC_ORIGIN did
// ─────────────────────────────────────────────────────────────────────────────
describe("Feature: app-navigation-origins, Property 1: APP_PUBLIC_ORIGIN produces same URLs as SITE_PUBLIC_ORIGIN did", () => {
  it("for any valid origin in production, each app URL equals stripTrailingSlash(origin) + app.path", async () => {
    await fc.assert(
      fc.asyncProperty(validOriginArb, async (origin) => {
        vi.stubEnv("NODE_ENV", "production");
        clearAppUrlEnvVars();
        vi.stubEnv("APP_PUBLIC_ORIGIN", origin);

        const appUrls = await importFreshAppUrls();
        const stripped = stripTrailingSlash(origin);

        for (const [app, path] of Object.entries(APP_PATHS)) {
          const expected = path === "/" ? stripped : `${stripped}${path}`;
          expect(appUrls[app as keyof typeof appUrls]).toBe(expected);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 2: Trailing slash normalization is idempotent
// ─────────────────────────────────────────────────────────────────────────────
describe("Feature: app-navigation-origins, Property 2: Trailing slash normalization is idempotent", () => {
  it("appUrls produced from origin+slashes equals appUrls produced from origin alone", async () => {
    await fc.assert(
      fc.asyncProperty(
        validOriginArb,
        fc.integer({ min: 0, max: 5 }),
        async (origin, extraSlashes) => {
          vi.stubEnv("NODE_ENV", "production");
          clearAppUrlEnvVars();

          // Resolve with no extra slashes
          vi.stubEnv("APP_PUBLIC_ORIGIN", origin);
          const urlsClean = await importFreshAppUrls();

          // Resolve with extra trailing slashes
          vi.stubEnv("APP_PUBLIC_ORIGIN", origin + "/".repeat(extraSlashes));
          const urlsSlashed = await importFreshAppUrls();

          expect(urlsSlashed).toEqual(urlsClean);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 3: APP_PUBLIC_ORIGIN is ignored outside production
// ─────────────────────────────────────────────────────────────────────────────
describe("Feature: app-navigation-origins, Property 3: APP_PUBLIC_ORIGIN is ignored outside production", () => {
  it("for any APP_PUBLIC_ORIGIN value and any non-production NODE_ENV, output equals output with APP_PUBLIC_ORIGIN unset", async () => {
    await fc.assert(
      fc.asyncProperty(
        validOriginArb,
        fc.constantFrom("development", "test", ""),
        async (origin, nodeEnv) => {
          clearAppUrlEnvVars();
          vi.stubEnv("NODE_ENV", nodeEnv);

          // With APP_PUBLIC_ORIGIN set
          vi.stubEnv("APP_PUBLIC_ORIGIN", origin);
          const urlsWithOrigin = await importFreshAppUrls();

          // Without APP_PUBLIC_ORIGIN
          vi.stubEnv("APP_PUBLIC_ORIGIN", "");
          const urlsWithoutOrigin = await importFreshAppUrls();

          expect(urlsWithOrigin).toEqual(urlsWithoutOrigin);
        },
      ),
      { numRuns: 100 },
    );
  });
});
