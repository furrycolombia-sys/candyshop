/**
 * Supabase environment configuration.
 *
 * SUPABASE_URL: used by the browser Supabase client. Baked at build time.
 * SUPABASE_REST_URL: used by server-side code (API routes, SSR client).
 *   Prefers SUPABASE_URL_INTERNAL (Docker networking) at runtime,
 *   falls back to NEXT_PUBLIC_SUPABASE_URL.
 * SUPABASE_COOKIE_KEY: the auth storage key that both client and server
 *   must agree on so cookies match. Always derived from the build-time URL.
 */

const DEFAULT_SUPABASE_URL = "http://127.0.0.1:54321";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;

// Dynamic key access prevents Turbopack from inlining at build time.
const _internalKey = "SUPABASE_URL_INTERNAL";
export const SUPABASE_REST_URL =
  (globalThis.window === undefined ? process.env[_internalKey] : undefined) ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** Shared auth storage key so client and server cookies always match. */
function deriveProjectRef(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1"
      ? hostname
      : hostname.split(".")[0];
  } catch {
    return "localhost";
  }
}
export const SUPABASE_COOKIE_KEY = `sb-${deriveProjectRef(SUPABASE_URL)}-auth-token`;
