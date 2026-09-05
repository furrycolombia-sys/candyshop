/* eslint-disable i18next/no-literal-string */
import { getCurrentUserId } from "api/supabase";
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
    // Consume body to avoid connection leaks; do not log raw text (may contain schema details)
    await response.text();
    throw new Error(
      `Admin API failed for ${path} (${String(response.status)})`,
    );
  }

  return response;
}

type GrantedPermissionRow = {
  expires_at: string | null;
  resource_permission_id: string;
  resource_permissions: { permissions: { key: string } };
};

/** A row as stored, including which side of grant/deny it is on. */
export type PermissionModeRow = GrantedPermissionRow & {
  mode: "grant" | "deny";
};

/**
 * The permission keys a user effectively holds, by the same rule the database
 * uses.
 *
 * `public.has_permission()` is the authority -- every RLS policy calls it --
 * and it reads:
 *
 *   exists(grant, unexpired)  AND  NOT exists(deny, unexpired)
 *
 * A deny revokes the key outright. The API layer used to ask only for
 * `mode=eq.grant`, which reimplements that rule with its second half missing,
 * so a denied user would be refused by RLS and admitted by these routes.
 *
 * `user_permissions` is unique on (user_id, resource_permission_id), so one
 * scope cannot hold both. But `resource_permissions` is unique on
 * (permission_id, resource_type, resource_id) -- the table exists to scope one
 * permission across many resources -- so one KEY can be granted on one scope
 * and denied on another. That is the case the missing clause got wrong.
 *
 * @param rows - the user's permission rows, both modes, as stored.
 * @returns the keys that survive, deduplicated.
 */
export function getEffectivePermissionKeys(
  rows: readonly PermissionModeRow[],
): string[] {
  const now = Date.now();
  const active = rows.filter(
    (row) => !row.expires_at || Date.parse(row.expires_at) > now,
  );

  const denied = new Set(
    active
      .filter((row) => row.mode === "deny")
      .map((row) => row.resource_permissions.permissions.key),
  );

  return [
    ...new Set(
      active
        .filter((row) => row.mode !== "deny")
        .map((row) => row.resource_permissions.permissions.key)
        .filter((key) => !denied.has(key)),
    ),
  ];
}

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

/**
 * Every permission row for a user, both modes, so denies can be honoured.
 *
 * Deliberately separate from {@link fetchGrantedPermissions}, which returns
 * grant rows for the editor to revoke and must keep doing exactly that.
 *
 * @param userId - the user to read.
 * @returns the keys the user effectively holds.
 */
async function fetchEffectivePermissionKeys(userId: string): Promise<string[]> {
  const response = await adminFetch(
    createRestPath("user_permissions", {
      user_id: `eq.${validateUuid(userId)}`,
      select:
        "expires_at,mode,resource_permission_id,resource_permissions!inner(permissions!inner(key))",
    }),
  );

  return getEffectivePermissionKeys(
    (await response.json()) as PermissionModeRow[],
  );
}

export async function getAuthorizedAdmin(
  requiredKeys: string[],
): Promise<string | null> {
  const sessionSupabase = await createServerSupabaseClient();
  const userId = await getCurrentUserId(sessionSupabase);

  if (!userId) return null;

  const grantedKeys = await fetchEffectivePermissionKeys(userId);
  const authorized = requiredKeys.every((key) => grantedKeys.includes(key));

  return authorized ? userId : null;
}
