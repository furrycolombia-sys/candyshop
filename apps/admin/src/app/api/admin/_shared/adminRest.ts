/* eslint-disable i18next/no-literal-string */
import { createServerSupabaseClient } from "api/supabase/server";

// Dynamic key access prevents Turbopack from inlining at build time.
const supabaseUrl =
  process.env["SUPABASE_URL_INTERNAL"] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const FORBIDDEN_ERROR = "Forbidden";
export const INVALID_PAYLOAD_ERROR = "Invalid payload";
export const BAD_REQUEST_STATUS = 400;
export const INTERNAL_SERVER_ERROR_STATUS = 500;
export const RETURN_MINIMAL = "return=minimal";
export const MERGE_DUPLICATES_RETURN_MINIMAL =
  "resolution=merge-duplicates,return=minimal";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getRestHeaders() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin REST client is not configured");
  }

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function getRestUrl(path: string) {
  if (!supabaseUrl) {
    throw new Error("Supabase URL is not configured");
  }

  return `${supabaseUrl}/rest/v1/${path}`;
}

export function createRestPath(
  table: string,
  query: Record<string, string | readonly string[]> = {},
) {
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

  const serialized = searchParams.toString();
  return serialized ? `${table}?${serialized}` : table;
}

export function validateUuid(value: string) {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(INVALID_PAYLOAD_ERROR);
  }
  return value;
}

export async function adminFetch(path: string, init?: RequestInit) {
  const response = await fetch(getRestUrl(path), {
    ...init,
    headers: {
      ...getRestHeaders(),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Admin API failed for ${path}`);
  }

  return response;
}

type GrantedPermissionRow = {
  expires_at: string | null;
  resource_permission_id: string;
  resource_permissions: { permissions: { key: string } };
};

function getActiveGrantedPermissions(rows: GrantedPermissionRow[]) {
  const now = Date.now();

  return rows
    .filter((row) => !row.expires_at || Date.parse(row.expires_at) > now)
    .map((row) => ({
      key: row.resource_permissions.permissions.key,
      resourcePermissionId: row.resource_permission_id,
    }));
}

export async function fetchGrantedPermissions(
  userId: string,
): Promise<Array<{ key: string; resourcePermissionId: string }>> {
  const response = await adminFetch(
    createRestPath("user_permissions", {
      user_id: `eq.${validateUuid(userId)}`,
      mode: "eq.grant",
      select:
        "expires_at,resource_permission_id,resource_permissions!inner(permissions!inner(key))",
    }),
  );

  return getActiveGrantedPermissions(
    (await response.json()) as GrantedPermissionRow[],
  );
}

export async function fetchGrantedPermissionKeys(
  userId: string,
): Promise<string[]> {
  return (await fetchGrantedPermissions(userId)).map((row) => row.key);
}

export async function getAuthorizedAdmin(
  requiredKeys: string[],
): Promise<string | null> {
  const sessionSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  if (!user) return null;

  const grantedKeys = await fetchGrantedPermissionKeys(user.id);
  const authorized = requiredKeys.every((key) => grantedKeys.includes(key));

  return authorized ? user.id : null;
}
