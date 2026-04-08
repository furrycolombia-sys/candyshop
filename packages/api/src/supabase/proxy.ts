import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import { mergeSupabaseCookieOptions } from "./cookies";
import type { Database } from "./types";

/**
 * Refreshes the Supabase auth session in the proxy (middleware) layer.
 *
 * Must be called in every proxy invocation to keep the session alive.
 * Returns the (potentially updated) response with refreshed cookies.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet)
            request.cookies.set(name, value);
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet)
            supabaseResponse.cookies.set(
              name,
              value,
              mergeSupabaseCookieOptions(options, request),
            );
        },
      },
    },
  );

  // Refresh session — must be called before any auth checks.
  // Do NOT add code between createServerClient and getClaims.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
