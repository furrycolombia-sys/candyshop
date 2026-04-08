import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import { mergeSupabaseCookieOptions } from "./cookies";

const LOCAL_HOST = "localhost";

/**
 * Allowed redirect origins for post-auth redirects.
 * Prevents open redirect attacks by validating absolute URLs
 * against known app origins.
 */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_AUTH_URL,
  process.env.NEXT_PUBLIC_STORE_URL,
  process.env.NEXT_PUBLIC_ADMIN_URL,
  process.env.NEXT_PUBLIC_PAYMENTS_URL,
  process.env.NEXT_PUBLIC_STUDIO_URL,
  process.env.NEXT_PUBLIC_PLAYGROUND_URL,
  process.env.NEXT_PUBLIC_LANDING_URL,
].filter(Boolean);

function getRequestOrigin(request: NextRequest): string {
  const fallback = new URL(request.url).origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");

  const candidateHost = forwardedHost ?? host;
  if (!candidateHost) return fallback;

  const protocol =
    forwardedProto ?? (candidateHost.includes(LOCAL_HOST) ? "http" : "https");

  try {
    return new URL(`${protocol}://${candidateHost}`).origin;
  } catch {
    return fallback;
  }
}

function isSafeRedirect(url: string): boolean {
  // Relative paths are safe, but reject protocol-relative URLs (//evil.com)
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const parsed = new URL(url);
    return ALLOWED_ORIGINS.some((allowed) => {
      try {
        return parsed.origin === new URL(String(allowed)).origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

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
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/en";
  const destination = isSafeRedirect(next) ? next : "/en";

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
          response.cookies.set(
            name,
            value,
            mergeSupabaseCookieOptions(options, request),
          );
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
