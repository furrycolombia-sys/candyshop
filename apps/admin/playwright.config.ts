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
    baseURL: "http://localhost:5002",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: 45_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm next dev --port 5002",
    url: "http://localhost:5002",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_BASE_URL: "/api",
      NEXT_PUBLIC_API_PREFIX: "",
      NEXT_PUBLIC_ENABLE_MOCKS: "false",
    },
  },
});
