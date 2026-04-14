import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

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

/**
 * Playwright config for E2E tests.
 *
 * All e2e tests run against the Docker e2e container (port 8089).
 * Set E2E_PUBLIC_ORIGIN and PLAYWRIGHT_USE_EXISTING_STACK=true
 * (handled automatically by `pnpm test:e2e`).
 *
 * No webServer — the Docker container is managed externally by
 * `scripts/e2e-docker.mjs`.
 */
export default defineConfig({
  testDir: "./e2e",
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
