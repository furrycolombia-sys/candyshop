import { test as base, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  BUYER_PERMISSIONS,
  grantPermissions,
  injectSession,
} from "../helpers/session";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL)
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is not set. Ensure the correct .env.* file is loaded.",
  );
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY)
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is required for E2E tests. Set it in your .env.* file.",
  );

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

  await grantPermissions(user.user!.id, BUYER_PERMISSIONS);

  await injectSession(context, {
    userId: user.user!.id,
    email,
    accessToken: session.session!.access_token,
    refreshToken: session.session!.refresh_token,
  });

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
