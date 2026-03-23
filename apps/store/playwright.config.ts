import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const landingDir = path.resolve(__dirname, "../landing");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 45_000,
  },
  projects: [
    // Setup: create authenticated session before tests
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Tests: run with authenticated session
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/session.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: process.env.CI
        ? "pnpm next start --port 5001"
        : "pnpm next dev --port 5001",
      url: "http://localhost:5001",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: "/api",
        NEXT_PUBLIC_API_PREFIX: "",
        NEXT_PUBLIC_ENABLE_MOCKS: "true",
      },
    },
    {
      command: process.env.CI
        ? "npx next start --port 5004"
        : "npx next dev --port 5004",
      cwd: landingDir,
      url: "http://localhost:5004",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
