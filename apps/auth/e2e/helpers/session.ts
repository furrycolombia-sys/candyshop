import path from "node:path";

import type { BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS loader script
const { loadRootEnv } = require(
  path.resolve(__dirname, "../../../../scripts/load-root-env.js"),
);
loadRootEnv();

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Direct REST helper for data operations that need to bypass RLS.
 * The JS client with sb_secret_ keys doesn't bypass RLS for PostgREST,
 * but raw REST API calls with the same key do.
 */
export async function adminInsert(
  table: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Admin insert into ${table} failed: ${err.message}`);
  }
  const rows = await res.json();
  return rows[0];
}

/**
 * Direct REST helper for querying data as admin.
 */
export async function adminQuery(
  table: string,
  params: string,
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  return res.json();
}

/**
 * Direct REST helper for deleting data as admin.
 */
export async function adminDelete(
  table: string,
  params: string,
): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method: "DELETE",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
}

export interface TestUser {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Create a test user via Supabase admin API.
 * Returns user info + tokens (does NOT inject cookies).
 */
export async function createTestUser(label: string): Promise<TestUser> {
  const email = `e2e-${label}-${Date.now()}@test.invalid`;
  const password = `test-${Date.now()}-${label}`;

  const { data: user, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError)
    throw new Error(`Failed to create ${label} user: ${createError.message}`);

  const { data: session, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (signInError)
    throw new Error(`Failed to sign in ${label} user: ${signInError.message}`);

  return {
    userId: user.user!.id,
    email,
    accessToken: session.session!.access_token,
    refreshToken: session.session!.refresh_token,
  };
}

/**
 * Inject a user's session cookies into the browser context.
 * Call this to "switch" to a different user.
 */
export async function injectSession(
  context: BrowserContext,
  user: TestUser,
): Promise<void> {
  // Local Supabase uses http
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookieBase = `sb-${projectRef}-auth-token`;

  // Clear existing auth cookies first
  const cookies = await context.cookies();
  const hasAuthCookies = cookies.some((c) => c.name.startsWith("sb-"));
  if (hasAuthCookies) {
    await context.clearCookies();
  }

  await context.addCookies([
    {
      name: `${cookieBase}.0`,
      value: `base64-${btoa(
        JSON.stringify({
          access_token: user.accessToken,
          refresh_token: user.refreshToken,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: user.userId, email: user.email },
        }),
      )}`,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
