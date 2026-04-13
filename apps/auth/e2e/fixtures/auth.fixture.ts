import path from "node:path";

import { test as base, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Load root .env files so SUPABASE_SERVICE_ROLE_KEY is available
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadRootEnv } = require(
  path.resolve(__dirname, "../../../../scripts/load-root-env.js"),
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getLocalSupabaseEnv } = require(
  path.resolve(__dirname, "../../../../scripts/local-supabase-env.js"),
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../../scripts/app-url-resolver.js"),
);
loadRootEnv();

const localSupabaseEnv = getLocalSupabaseEnv();

function isPlaceholder(value: string | undefined) {
  return !value || value.startsWith("YOUR_");
}

const SUPABASE_URL =
  localSupabaseEnv.API_URL ||
  (isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? "http://127.0.0.1:54321"
    : process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  localSupabaseEnv.SERVICE_ROLE_KEY ||
  (isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? ""
    : process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  "";
const AUTH_URL = resolveE2EAppUrls().auth;

function hasUsableServiceRoleKey() {
  return (
    Boolean(SERVICE_ROLE_KEY) &&
    SERVICE_ROLE_KEY !== "YOUR_SUPABASE_SERVICE_ROLE_KEY" &&
    SERVICE_ROLE_KEY.split(".").length === 3
  );
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Create a test user via Supabase admin API and inject session cookies
 * into the browser context. No OAuth flow needed.
 */
async function createTestSession(context: BrowserContext) {
  // For localhost/127.0.0.1 URLs, use "localhost" as the project ref to match
  // what the Supabase JS client in the browser uses.
  const refHostname = new URL(SUPABASE_URL).hostname;
  const projectRef =
    refHostname === "localhost" || refHostname === "127.0.0.1"
      ? "localhost"
      : refHostname.split(".")[0];
  const cookieBase = `sb-${projectRef}-auth-token`;
  const authHost = new URL(AUTH_URL);
  const isLocalhost =
    authHost.hostname === "localhost" || authHost.hostname === "127.0.0.1";
  const hostParts = authHost.hostname.split(".");
  const sharedDomain =
    !isLocalhost && hostParts.length >= 2
      ? `.${hostParts.slice(-2).join(".")}`
      : authHost.hostname;

  if (!hasUsableServiceRoleKey()) {
    const mockSession = {
      access_token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmUtdGVzdCIsImVtYWlsIjoiZTJlQHRlc3QuaW52YWxpZCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock",
      refresh_token: "mock-refresh-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: "e2e-mock-user",
        email: "e2e@test.invalid",
        app_metadata: { provider: "email" },
        user_metadata: { name: "E2E Mock User" },
      },
    };

    await context.addCookies([
      {
        name: `${cookieBase}.0`,
        value: `base64-${btoa(JSON.stringify(mockSession))}`,
        domain: sharedDomain,
        path: "/",
        httpOnly: false,
        secure: !isLocalhost,
        sameSite: "Lax",
      },
    ]);

    return {
      userId: mockSession.user.id,
      email: mockSession.user.email,
      cleanup: async () => {},
    };
  }

  const email = `e2e-${Date.now()}@test.invalid`;
  const password = `test-${Date.now()}`;

  // Create user via admin API (bypasses email confirmation)
  const { data: user, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError)
    throw new Error(`Failed to create test user: ${createError.message}`);

  // Sign in to get a session
  const { data: session, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (signInError)
    throw new Error(`Failed to sign in test user: ${signInError.message}`);

  const accessToken = session.session!.access_token;
  const refreshToken = session.session!.refresh_token;

  await context.addCookies([
    {
      name: `${cookieBase}.0`,
      value: `base64-${btoa(JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: user.user }))}`,
      domain: sharedDomain,
      path: "/",
      httpOnly: false,
      secure: !isLocalhost,
      sameSite: "Lax",
    },
  ]);

  return {
    userId: user.user!.id,
    email,
    cleanup: async () => {
      await supabaseAdmin.auth.admin.deleteUser(user.user!.id);
    },
  };
}

/**
 * Extended test fixture with authenticated user.
 */
export const test = base.extend<{
  authenticatedPage: {
    userId: string;
    email: string;
  };
}>({
  authenticatedPage: async ({ context }, use) => {
    const { userId, email, cleanup } = await createTestSession(context);

    await use({ userId, email });

    // Cleanup: delete test user after test
    await cleanup();
  },
});

export { expect } from "@playwright/test";
