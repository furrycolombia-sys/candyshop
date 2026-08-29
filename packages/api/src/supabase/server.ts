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
 * Creates a Supabase client authenticated as `service_role`, bypassing Row
 * Level Security entirely.
 *
 * Only for server-side code that must read or write columns RLS
 * intentionally hides from every authenticated caller — e.g. `identity_sub`,
 * which even the profile's own owner cannot read or write directly (see
 * supabase/migrations/20260829150000_protect_identity_sub.sql and
 * .../20260829160000_protect_identity_sub_select.sql). `resolveProfile`'s
 * `ProfileStore` needs exactly this: claiming and creating a profile happen
 * before the caller has an identity `current_user_id()` can resolve.
 *
 * Never send this client, or any value derived from it, to a browser.
 */
export function createServiceRoleSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  }

  return createClient<Database>(SUPABASE_REST_URL, serviceRoleKey);
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
