import { mergeSupabaseCookieOptions } from "api/supabase/cookies";
import { createServerSupabaseClient } from "api/supabase/server";
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAMES,
  createAccessTokenCookieOptions,
} from "auth/server";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_ORIGINS = new Set(
  [
    process.env.NEXT_PUBLIC_AUTH_URL,
    process.env.NEXT_PUBLIC_STORE_URL,
    process.env.NEXT_PUBLIC_ADMIN_URL,
    process.env.NEXT_PUBLIC_PAYMENTS_URL,
    process.env.NEXT_PUBLIC_STUDIO_URL,
    process.env.NEXT_PUBLIC_PLAYGROUND_URL,
    process.env.NEXT_PUBLIC_LANDING_URL,
  ].filter(Boolean),
);
const HEADER_ALLOW_ORIGIN = "Access-Control-Allow-Origin";
const HEADER_ALLOW_CREDENTIALS = "Access-Control-Allow-Credentials";
const HEADER_VARY = "Vary";
const HEADER_ALLOW_METHODS = "Access-Control-Allow-Methods";
const HEADER_ALLOW_HEADERS = "Access-Control-Allow-Headers";
const ALLOW_CREDENTIALS_VALUE = "true";
const VARY_ORIGIN_VALUE = "Origin";
const ALLOW_METHODS_VALUE = "POST, OPTIONS";
const ALLOW_HEADERS_VALUE = "Content-Type, Authorization, Accept";
const NO_CONTENT_STATUS = 204;
const EXPIRED_COOKIE_MAX_AGE = 0;

function buildAccessTokenCookieOptions(request: NextRequest, maxAge: number) {
  return mergeSupabaseCookieOptions(
    createAccessTokenCookieOptions(maxAge),
    request,
  );
}

function applyCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.headers.set(HEADER_ALLOW_ORIGIN, origin);
    response.headers.set(HEADER_ALLOW_CREDENTIALS, ALLOW_CREDENTIALS_VALUE);
    response.headers.set(HEADER_VARY, VARY_ORIGIN_VALUE);
  }
  response.headers.set(HEADER_ALLOW_METHODS, ALLOW_METHODS_VALUE);
  response.headers.set(HEADER_ALLOW_HEADERS, ALLOW_HEADERS_VALUE);
  return response;
}

export async function OPTIONS(request: NextRequest) {
  return applyCorsHeaders(
    new NextResponse(null, { status: NO_CONTENT_STATUS }),
    request,
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // Validate user server-side via getUser() — contacts Supabase Auth server for JWT verification
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const response = NextResponse.json({ ok: false }, { status: 401 });
    response.cookies.set(
      AUTH_COOKIE_NAMES.accessToken,
      "",
      buildAccessTokenCookieOptions(request, EXPIRED_COOKIE_MAX_AGE),
    );
    return applyCorsHeaders(response, request);
  }

  // Retrieve the session token only after server-side validation has passed
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    const response = NextResponse.json({ ok: false }, { status: 401 });
    response.cookies.set(
      AUTH_COOKIE_NAMES.accessToken,
      "",
      buildAccessTokenCookieOptions(request, EXPIRED_COOKIE_MAX_AGE),
    );
    return applyCorsHeaders(response, request);
  }

  const ttl =
    typeof session.expires_in === "number" && session.expires_in > 0
      ? session.expires_in
      : AUTH_COOKIE_MAX_AGE.accessToken;

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    AUTH_COOKIE_NAMES.accessToken,
    session.access_token,
    buildAccessTokenCookieOptions(request, ttl),
  );
  return applyCorsHeaders(response, request);
}
