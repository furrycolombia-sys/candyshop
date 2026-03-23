import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Handles the OAuth callback code exchange in a Route Handler.
 *
 * Creates a Supabase server client that reads the PKCE code verifier from
 * request cookies, exchanges the authorization code for a session, and sets
 * the session cookies on the redirect response.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function handleOAuthCallback(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/en";
  const destination = next.startsWith("/") ? next : "/en";

  if (!code) {
    return NextResponse.redirect(new URL("/en/login", origin));
  }

  const redirectUrl = new URL(destination, origin);
  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.redirect(redirectUrl);
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] Code exchange failed:", error.message);
    return NextResponse.redirect(new URL("/en/login", origin));
  }

  return response;
}
