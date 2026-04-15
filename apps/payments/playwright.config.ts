import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

// Load env vars (resolves $secret: refs and sets TARGET_ENV-specific config)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadRootEnv } = require(
  path.resolve(__dirname, "../../scripts/load-root-env.js"),
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

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  use: {
    baseURL: appUrls.payments,
    extraHTTPHeaders,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 45_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer:
    process.env.PLAYWRIGHT_USE_EXISTING_STACK === "true"
      ? undefined
      : {
          command: "pnpm next dev --port 5005",
          url: "http://localhost:5005",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            NEXT_PUBLIC_API_BASE_URL: "/api",
            NEXT_PUBLIC_API_PREFIX: "",
          },
        },
});
