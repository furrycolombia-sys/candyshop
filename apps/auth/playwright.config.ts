import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const WEB_SERVER_TIMEOUT_MS = 120_000;

interface AppServerConfig {
  port: number;
  /** Relative path from this config file to the app directory. Omit for current app. */
  relativeCwd?: string;
}

const APP_SERVERS: AppServerConfig[] = [
  { port: 5000 },
  { port: 5001, relativeCwd: "../store" },
  { port: 5005, relativeCwd: "../payments" },
  { port: 5002, relativeCwd: "../admin" },
  { port: 5006, relativeCwd: "../studio" },
];

function buildWebServers() {
  return APP_SERVERS.map(({ port, relativeCwd }) => ({
    command: process.env.CI
      ? `npx next start --port ${port}`
      : `npx next dev --port ${port}`,
    ...(relativeCwd ? { cwd: path.resolve(__dirname, relativeCwd) } : {}),
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: WEB_SERVER_TIMEOUT_MS,
  }));
}

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
  webServer:
    process.env.PLAYWRIGHT_USE_EXISTING_STACK === "true"
      ? undefined
      : buildWebServers(),
});
