import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

// Load env vars (resolves $secret: refs and sets TARGET_ENV-specific config)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadRootEnv } = require(
  path.resolve(__dirname, "../../scripts/load-root-env.cjs"),
);
loadRootEnv({ targetEnv: process.env.TARGET_ENV });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../scripts/app-url-resolver.js"),
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getE2EExtraHTTPHeaders } = require(
  path.resolve(__dirname, "../../scripts/app-url-resolver.js"),
);

const appUrls = resolveE2EAppUrls();
const extraHTTPHeaders = getE2EExtraHTTPHeaders();
const isSingleOriginPathRouting =
  new URL(appUrls.auth).origin === new URL(appUrls.store).origin;
const stagingPathRoutingIgnores =
  process.env.TARGET_ENV === "staging" && isSingleOriginPathRouting
    ? [
        "**/checkout-stock-integrity.spec.ts",
        "**/delegated-admin-flow.spec.ts",
        "**/full-purchase-flow.spec.ts",
      ]
    : [];

/**
 * Playwright config for E2E tests.
 *
 * All e2e tests run against the Docker e2e container (port 8089).
 * Set TARGET_ENV to load the desired env file
 * (handled automatically by `pnpm test:e2e`).
 *
 * No webServer — the Docker container is managed externally by
 * `scripts/e2e-docker.mjs`.
 */
export default defineConfig({
  testDir: "./e2e",
  testIgnore: stagingPathRoutingIgnores,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  use: {
    baseURL: appUrls.auth,
    extraHTTPHeaders,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 45_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // No webServer — Docker container is managed by pnpm test:e2e
});
