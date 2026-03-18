import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Docker deployment smoke tests.
 *
 * Runs against an already-running Docker container.
 * Set DOCKER_BASE_URL env var to point at the container (e.g. http://localhost:32768).
 *
 * No webServer — the container must be started externally
 * (by scripts/docker-health-check.sh or manually).
 */
export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: process.env.DOCKER_BASE_URL || "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // No webServer — Docker container is managed externally
});
