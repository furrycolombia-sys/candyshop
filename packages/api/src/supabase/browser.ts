import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import type { Database } from "./types";

/**
 * Creates a Supabase client for use in Client Components (browser).
 *
 * Call this in hooks, event handlers, or useEffect — not at module scope.
 * Each call returns a new client instance (cheap, no connection pool).
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    SUPABASE_URL || "http://localhost:54321",
    SUPABASE_ANON_KEY || "placeholder",
  );
}
