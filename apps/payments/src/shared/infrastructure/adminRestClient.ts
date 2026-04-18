/* eslint-disable i18next/no-literal-string -- infrastructure file: Supabase table/column names and API keys */

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuid(value: string): string {
  if (!UUID_REGEX.test(value)) {
    throw new Error("Invalid UUID format");
  }
  return value;
}

export function createRestPath(
  table: string,
  query: Record<string, string | readonly string[]>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      searchParams.set(key, value);
      continue;
    }

    for (const item of value) {
      searchParams.append(key, item);
    }
  }

  return `${table}?${searchParams.toString()}`;
}

// Dynamic key access prevents Turbopack from inlining at build time,
// allowing the runtime env var to be read when the server starts.
const supabaseUrl =
  process.env["SUPABASE_URL_INTERNAL"] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getAdminRestHeaders(extra?: HeadersInit): HeadersInit {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin REST client is not configured");
  }
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export function getAdminRestUrl(path: string): string {
  if (!supabaseUrl) {
    throw new Error("Supabase URL is not configured");
  }
  return `${supabaseUrl}/rest/v1/${path}`;
}

export async function adminFetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(getAdminRestUrl(path), {
    ...init,
    headers: {
      ...getAdminRestHeaders(),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    // Consume body to avoid connection leaks; do not log raw text (may contain schema details)
    await response.text();
    throw new Error(
      `Admin API failed for ${path} (${String(response.status)})`,
    );
  }

  return (await response.json()) as T;
}
