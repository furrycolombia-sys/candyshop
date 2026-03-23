import fs from "node:fs";
import path from "node:path";

import { test as setup } from "@playwright/test";

// Load root .env files (same as next.config.ts does via loadRootEnv)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadRootEnv } = require(
  path.resolve(__dirname, "../../../scripts/load-root-env.js"),
);
loadRootEnv();

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const AUTH_FILE = "e2e/.auth/session.json";

/**
 * Global setup: authenticates a test user and saves the session as storageState.
 *
 * - With Supabase (local dev): creates a real user via admin API
 * - Without Supabase (CI): injects a mock session cookie so ProtectedRoute passes
 *   (the client-side getSession() reads from cookies without server JWT validation)
 */
setup("authenticate", async ({ context, page }) => {
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookieBase = `sb-${projectRef}-auth-token`;

  const hasSupabase =
    SERVICE_ROLE_KEY && SERVICE_ROLE_KEY !== "YOUR_SUPABASE_SERVICE_ROLE_KEY";

  if (hasSupabase) {
    // Real Supabase available: create test user via admin API
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = `e2e-${Date.now()}@test.invalid`;
    const password = `test-${Date.now()}`;

    const { data: user, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createError)
      throw new Error(`Failed to create test user: ${createError.message}`);

    const { data: session, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (signInError)
      throw new Error(`Failed to sign in test user: ${signInError.message}`);

    await context.addCookies([
      {
        name: `${cookieBase}.0`,
        value: `base64-${btoa(JSON.stringify({ access_token: session.session!.access_token, refresh_token: session.session!.refresh_token, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: user.user }))}`,
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);
  } else {
    // No Supabase (CI): inject a mock session cookie
    // Client-side getSession() reads from cookies without server validation,
    // so ProtectedRoute sees isAuthenticated=true and renders content
    console.log("[auth.setup] No Supabase — injecting mock session for CI");
    const mockSession = {
      access_token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmUtdGVzdCIsImVtYWlsIjoiZTJlQHRlc3QuaW52YWxpZCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock",
      refresh_token: "mock-refresh-token",
      token_type: "bearer",
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      user: {
        id: "e2e-test-user-ci",
        email: "e2e@test.invalid",
        app_metadata: { provider: "email" },
        user_metadata: { name: "E2E Test User" },
        aud: "authenticated",
        role: "authenticated",
      },
    };

    await context.addCookies([
      {
        name: `${cookieBase}.0`,
        value: `base64-${btoa(JSON.stringify(mockSession))}`,
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);
  }

  // Save authenticated state for all test projects
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.goto("http://localhost:5001/en");
  await context.storageState({ path: AUTH_FILE });
});
