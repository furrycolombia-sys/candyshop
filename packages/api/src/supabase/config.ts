/**
 * Supabase environment configuration.
 *
 * SUPABASE_URL: used by the browser Supabase client. Baked at build time.
 * SUPABASE_REST_URL: used by server-side code (API routes, SSR client).
 *   Uses SUPABASE_URL_INTERNAL (Docker networking) when set,
 *   otherwise uses NEXT_PUBLIC_SUPABASE_URL.
 * SUPABASE_COOKIE_KEY: the auth storage key that both client and server
 *   must agree on so cookies match. Always derived from the build-time URL.
 */

const _publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!_publicUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
export const SUPABASE_URL = _publicUrl;

// Dynamic key access prevents Turbopack from inlining at build time.
const _internalKey = "SUPABASE_URL_INTERNAL";
const _internalUrl =
  globalThis.window === undefined ? process.env[_internalKey] : undefined;
export const SUPABASE_REST_URL = _internalUrl || _publicUrl;

const _anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!_anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required");
export const SUPABASE_ANON_KEY = _anonKey;

/** Shared auth storage key so client and server cookies always match. */
function deriveProjectRef(url: string): string {
  const hostname = new URL(url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1"
    ? hostname
    : hostname.split(".")[0];
}
export const SUPABASE_COOKIE_KEY = `sb-${deriveProjectRef(SUPABASE_URL)}-auth-token`;
