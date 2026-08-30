import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Resolves the caller's local `user_profiles.id` via the `current_user_id()`
 * RPC.
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
 *
 * Returns null when signed out, or when the RPC call itself fails — callers
 * must treat null as deny, same as the database function itself does.
 */
export async function getCurrentUserId(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("current_user_id");
  return error ? null : (data ?? null);
}
