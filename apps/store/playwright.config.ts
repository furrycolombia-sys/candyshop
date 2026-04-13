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

const landingDir = path.resolve(__dirname, "../landing");
const appUrls = resolveE2EAppUrls();
const extraHTTPHeaders = getE2EExtraHTTPHeaders();
const localSupabaseEnv = getLocalSupabaseEnv();

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

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  use: {
    baseURL: appUrls.store,
    extraHTTPHeaders,
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
  webServer:
    process.env.PLAYWRIGHT_USE_EXISTING_STACK === "true"
      ? undefined
      : [
          {
            command: process.env.CI
              ? "pnpm next start --port 5001"
              : "pnpm next dev --port 5001",
            url: "http://localhost:5001",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            env: {
              ...buildServerEnv(),
              NEXT_PUBLIC_API_BASE_URL: "/api",
              NEXT_PUBLIC_API_PREFIX: "",
              NEXT_PUBLIC_ENABLE_MOCKS: process.env.CI ? "true" : "false",
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
            env: {
              ...buildServerEnv(),
              NEXT_PUBLIC_ENABLE_MOCKS: process.env.CI ? "true" : "false",
            },
          },
        ],
});
