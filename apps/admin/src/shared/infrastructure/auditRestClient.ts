/* eslint-disable i18next/no-literal-string -- infrastructure file: HTTP headers and audit schema identifiers are not user-facing copy */
import { getSupabaseAccessToken } from "api/supabase/browser";

import { supabaseUrl } from "@/shared/infrastructure/config/environment";

const JSON_CONTENT_TYPE = "application/json";

/** Get the Supabase REST base URL and anon key from environment */
export function getSupabaseConfig() {
  const url = supabaseUrl;
  const serverKey = process.env.SUPABASE_ANON_KEY;
  if (!serverKey) {
    // SUPABASE_ANON_KEY missing — falling back to NEXT_PUBLIC_ key. Verify server env config.
    console.warn(
      "[auditRestClient] SUPABASE_ANON_KEY not set; falling back to NEXT_PUBLIC_SUPABASE_ANON_KEY. Check server environment configuration.",
    );
  }
  const key = serverKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return { url, key };
}

/**
 * Direct REST query to the audit schema using the caller's Clerk session
 * token.
 *
 * Used to be validated via `supabase.auth.getUser()`/`getSession()` — under
 * Third-Party Auth there is no Supabase Auth session to read, so the caller
 * no longer passes a Supabase client at all. `getSupabaseAccessToken()`
 * (browser-only) is the direct replacement: `null` means signed out or
 * `<ClerkProvider>` hasn't hydrated yet, either way "Unauthenticated" is the
 * right response for a manual REST call that can't fall back to the anon key
 * the way supabase-js's own client does.
 */
export async function auditRestQuery(
  table: string,
  params: URLSearchParams,
): Promise<unknown[]> {
  const { url, key } = getSupabaseConfig();

  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Unauthenticated");

  const endpoint = `${url}/rest/v1/${table}?${params.toString()}`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      // logged_actions_with_user is exposed in the public schema via a proxy view
      // (migration 20260421050000_expose_audit_view_in_public.sql). PostgREST's
      // audit schema is not exposed, so specifying Accept-Profile: public ensures
      // PostgREST resolves the view in the correct schema and avoids 406 errors.
      Accept: JSON_CONTENT_TYPE,
      "Accept-Profile": "public",
    },
  });

  if (!response.ok) {
    throw new Error(`Audit REST query failed: ${String(response.status)}`);
  }

  return response.json() as Promise<unknown[]>;
}
