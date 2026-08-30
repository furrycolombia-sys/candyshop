/**
 * Supabase environment configuration.
 *
 * SUPABASE_URL: used by the browser Supabase client. Baked at build time.
 * SUPABASE_REST_URL: used by server-side code (API routes, SSR client).
 *   Uses SUPABASE_URL_INTERNAL (Docker networking) when set,
 *   otherwise uses NEXT_PUBLIC_SUPABASE_URL.
 *
 * There used to be a SUPABASE_COOKIE_KEY here too — the auth storage key
 * the old cookie-based Supabase Auth session needed so client and server
 * cookies matched. Under Third-Party Auth (Clerk) there is no such session
 * to store, so it had no remaining callers once `proxy.ts` and
 * `callback.ts` (its only consumers) were deleted. See task-11-report.md.
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
