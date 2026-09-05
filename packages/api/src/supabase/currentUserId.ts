import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

export interface CurrentUserIdResult {
  /** The resolved local profile id, or null when signed out / no profile. */
  id: string | null;
  /**
   * True when the RPC call itself failed (network error, thrown exception,
   * or a Postgres error) — distinct from a legitimate "no profile" `null`.
   * Server-side callers that only need fail-closed authorization can ignore
   * this and treat `id === null` as deny either way (see `getCurrentUserId`
   * below). UI callers that need to tell "signed out" apart from "we
   * couldn't check" — so they don't log a genuinely signed-in person out
   * over a flaky request — should use `getCurrentUserIdResult` directly.
   */
  error: boolean;
}

/**
 * Resolves the caller's local `user_profiles.id` via the `current_user_id()`
 * RPC, distinguishing "no profile" from "the RPC call failed".
 *
 * Every foreign key that used to reference `auth.users.id` now references
 * `user_profiles.id` instead (see
 * supabase/migrations/20260829120000_repoint_user_fks.sql), and
 * `current_user_id()` reads `identity_sub` off the caller's own Clerk token
 * to resolve it (see supabase/migrations/20260829110000_current_user_id.sql).
 * This is the id every former `supabase.auth.getUser().data.user.id` read
 * must be replaced with — NOT the Clerk subject itself, which has no row in
 * any of these tables.
 *
 * Works with both the browser and server Supabase clients, since both pass
 * the Clerk session token through the same `accessToken` option (see
 * `browser.ts` and `server.ts`).
 */
export async function getCurrentUserIdResult(
  supabase: SupabaseClient<Database>,
): Promise<CurrentUserIdResult> {
  try {
    const { data, error } = await supabase.rpc("current_user_id");
    return { id: error ? null : (data ?? null), error: error !== null };
  } catch {
    return { id: null, error: true };
  }
}

/**
 * Convenience wrapper for callers that only need fail-closed authorization
 * and don't need to distinguish "signed out" from "the RPC call failed" —
 * both collapse to `null`, and callers must treat `null` as deny, same as
 * the database function itself does. Most server routes want this: an
 * authorization check that can't confirm the caller should refuse, not
 * guess. UI code that needs to avoid treating a transient failure as
 * "signed out" (e.g. `ProtectedRoute`, which must not log a real customer
 * out over a flaky network call) should call `getCurrentUserIdResult`
 * directly instead.
 */
export async function getCurrentUserId(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const { id } = await getCurrentUserIdResult(supabase);
  return id;
}
