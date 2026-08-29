import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_REST_URL } from "./config";
import type { Database } from "./types";

/**
 * Creates a Supabase client for use in Server Components, Route Handlers,
 * and Server Actions.
 *
 * Under Third-Party Auth, the Clerk session token *is* the Supabase access
 * token: Supabase trusts Clerk's JWKS directly, so there is no Supabase Auth
 * session and no cookie to store or refresh. `getToken` re-fetches (and
 * silently renews) a fresh token on every call, so passing it straight
 * through as `accessToken` keeps every request current without the cookie
 * machinery the previous cookie-session client needed.
 *
 * Must be called per-request (never cached or stored globally) so it always
 * reflects the caller's own Clerk session, not a request that ran earlier.
 *
 * Requires `clerkMiddleware()` to be running for this request — `auth()`
 * throws otherwise. See task-9-report.md for which apps do not yet have it.
 */
export async function createServerSupabaseClient() {
  const { getToken } = await auth();

  return createClient<Database>(SUPABASE_REST_URL, SUPABASE_ANON_KEY, {
    accessToken: getToken,
  });
}

/**
 * Get the authenticated user's email from Clerk.
 * Returns null if not signed in or Clerk is unavailable.
 */
export async function getServerUserEmail(): Promise<string | null> {
  try {
    const user = await currentUser();
    return user?.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    return null;
  }
}
