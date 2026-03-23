import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 45_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: process.env.CI
        ? "npx next start --port 5000"
        : "npx next dev --port 5000",
      url: "http://localhost:5000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: process.env.CI
        ? "npx next start --port 5001"
        : "npx next dev --port 5001",
      cwd: path.resolve(__dirname, "../store"),
      url: "http://localhost:5001",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
