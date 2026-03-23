import { test as base, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Create a test user via Supabase admin API and inject session cookies
 * into the browser context. No OAuth flow needed.
 */
async function createTestSession(context: BrowserContext) {
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

  // Inject session cookies into the browser context
  // Supabase stores tokens in cookies with a project-specific prefix
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
