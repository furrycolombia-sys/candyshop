import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Docker smoke tests.
 * Runs against an already-running container — no webServer setup needed.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/smoke.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: process.env.CONTAINER_URL ?? "http://localhost:8088",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
