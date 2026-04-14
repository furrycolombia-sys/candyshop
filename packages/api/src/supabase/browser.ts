import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import type { Database } from "./types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

/**
 * Creates a Supabase client for use in Client Components (browser).
 *
 * Reuses a singleton browser client so hooks across the app share auth state
 * and do not re-create clients on every mount.
 */
export function createBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );

  return browserClient;
}
