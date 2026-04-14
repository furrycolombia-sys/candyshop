import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  SUPABASE_ANON_KEY,
  SUPABASE_COOKIE_KEY,
  SUPABASE_REST_URL,
} from "./config";
import { mergeSupabaseCookieOptions } from "./cookies";
import type { Database } from "./types";

/**
 * Creates a Supabase client for use in Server Components, Route Handlers,
 * and Server Actions.
 *
 * Must be called per-request (never cached or stored globally).
 * Handles cookie read/write for session management.
 *
 * Uses SUPABASE_REST_URL so the server can reach Supabase via Docker
 * networking, while SUPABASE_COOKIE_KEY ensures cookie names match
 * the client-side Supabase client.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_REST_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: SUPABASE_COOKIE_KEY,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet)
            cookieStore.set(name, value, mergeSupabaseCookieOptions(options));
        } catch {
          // Called from a Server Component — safe to ignore.
          // Proxy (middleware) handles session refresh.
        }
      },
    },
  });
}

/**
 * Get the authenticated user's email from the server-side session.
 * Returns null if not authenticated or Supabase is unavailable.
 */
export async function getServerUserEmail(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}
