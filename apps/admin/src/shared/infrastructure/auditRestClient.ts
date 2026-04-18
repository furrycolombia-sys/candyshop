/* eslint-disable i18next/no-literal-string -- infrastructure file: HTTP headers and audit schema identifiers are not user-facing copy */
import type { SupabaseClient } from "@/shared/domain/types";
import { supabaseUrl } from "@/shared/infrastructure/config/environment";

const AUDIT_SCHEMA = "audit";
const JSON_CONTENT_TYPE = "application/json";

/** Get the Supabase REST base URL and anon key from environment */
export function getSupabaseConfig() {
  const url = supabaseUrl;
  // Prefer server-only key; fall back to the public anon key (safe, designed to be public)
  const key =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  return { url, key };
}

/** Direct REST query to the audit schema using the user's session token */
export async function auditRestQuery(
  supabase: SupabaseClient,
  table: string,
  params: URLSearchParams,
): Promise<unknown[]> {
  const { url, key } = getSupabaseConfig();

  // Validate user server-side via getUser() before using session token
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Unauthenticated");

  const endpoint = `${url}/rest/v1/${table}?${params.toString()}`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Accept-Profile": AUDIT_SCHEMA,
      Accept: JSON_CONTENT_TYPE,
    },
  });

  if (!response.ok) {
    throw new Error(`Audit REST query failed: ${String(response.status)}`);
  }

  return response.json() as Promise<unknown[]>;
}
