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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getLocalSupabaseEnv } = require(
  path.resolve(__dirname, "../../scripts/local-supabase-env.js"),
);

const WEB_SERVER_TIMEOUT_MS = 120_000;
const appUrls = resolveE2EAppUrls();
const extraHTTPHeaders = getE2EExtraHTTPHeaders();
const localSupabaseEnv = getLocalSupabaseEnv();

interface AppServerConfig {
  port: number;
  /** Relative path from this config file to the app directory. Omit for current app. */
  relativeCwd?: string;
}

const APP_SERVERS: AppServerConfig[] = [
  { port: 5000 },
  { port: 5001, relativeCwd: "../store" },
  { port: 5003, relativeCwd: "../playground" },
  { port: 5004, relativeCwd: "../landing" },
  { port: 5005, relativeCwd: "../payments" },
  { port: 5002, relativeCwd: "../admin" },
  { port: 5006, relativeCwd: "../studio" },
];

function buildServerEnv() {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

  if (process.env.PLAYWRIGHT_USE_EXISTING_STACK === "true") {
    return env;
  }

  return {
    ...env,
    NEXT_PUBLIC_SUPABASE_URL:
      localSupabaseEnv.API_URL || env.NEXT_PUBLIC_SUPABASE_URL || "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      localSupabaseEnv.ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    SUPABASE_SERVICE_ROLE_KEY:
      localSupabaseEnv.SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function buildWebServers() {
  return APP_SERVERS.map(({ port, relativeCwd }) => ({
    command: process.env.CI
      ? `npx next start --port ${port}`
      : `npx next dev --port ${port}`,
    ...(relativeCwd ? { cwd: path.resolve(__dirname, relativeCwd) } : {}),
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: WEB_SERVER_TIMEOUT_MS,
    env: buildServerEnv(),
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
    baseURL: appUrls.auth,
    extraHTTPHeaders,
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
