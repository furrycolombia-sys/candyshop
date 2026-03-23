/**
 * Supabase environment configuration.
 *
 * Uses STATIC process.env access so Next.js can inline these values
 * into the client bundle at build time. Dynamic access (process.env[key])
 * does NOT work with NEXT_PUBLIC_* variables.
 */

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
