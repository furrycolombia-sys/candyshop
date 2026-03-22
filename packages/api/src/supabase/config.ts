/**
 * Supabase environment configuration.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * from the environment. These are safe to expose client-side.
 */

const getEnvVar = (key: string): string => {
  const value =
    typeof process === "undefined"
      ? undefined
      : (process.env as Record<string, string | undefined>)[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const SUPABASE_URL = getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");
