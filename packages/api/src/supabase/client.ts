import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import type { Database } from "./types";

/**
 * Supabase client singleton for browser/client-side usage (lazy-initialized).
 *
 * Uses the anon (publishable) key — safe for client-side.
 * RLS policies control what data each user can access.
 * Returns null if Supabase env vars are not configured.
 */
let _client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!_client) {
    _client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

/** @deprecated Use getSupabaseClient() — this throws if env vars are missing */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client)
      throw new Error(
        "Supabase client not available: NEXT_PUBLIC_SUPABASE_URL is not configured",
      );
    return Reflect.get(client, prop);
  },
});
