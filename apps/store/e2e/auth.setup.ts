import { test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const AUTH_FILE = "e2e/.auth/session.json";

/**
 * Global setup: creates a test user via Supabase admin API, signs in,
 * injects session cookies into the browser, and saves the storage state.
 *
 * All other E2E tests reuse this authenticated session automatically.
 */
setup("authenticate", async ({ context, page }) => {
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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

  // Inject session cookies
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookieBase = `sb-${projectRef}-auth-token`;

  await context.addCookies([
    {
      name: `${cookieBase}.0`,
      value: `base64-${btoa(JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: user.user }))}`,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Navigate to trigger cookie write, then save state
  await page.goto("http://localhost:5001/en");
  await context.storageState({ path: AUTH_FILE });

  // Store user ID for cleanup in teardown
  process.env.E2E_TEST_USER_ID = user.user!.id;
});
