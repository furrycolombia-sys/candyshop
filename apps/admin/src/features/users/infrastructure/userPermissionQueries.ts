/* eslint-disable i18next/no-literal-string -- Supabase query params are not UI strings */
import type { createBrowserSupabaseClient } from "api/supabase";

import { ADMIN_UI_GRANT_REASON } from "@/features/users/domain/constants";
import type { UserProfileSummary } from "@/features/users/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

const SEARCH_RESULTS_LIMIT = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types yet
const USER_PROFILES_TABLE = "user_profiles" as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types yet
const PERMISSIONS_TABLE = "permissions" as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types yet
const RESOURCE_PERMISSIONS_TABLE = "resource_permissions" as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types yet
const USER_PERMISSIONS_TABLE = "user_permissions" as any;

/** Escape SQL LIKE wildcards to prevent pattern injection */
function escapeLikePattern(input: string): string {
  return input.replaceAll(/[%_\\]/g, (char) => `\\${char}`);
}

/** Search users by email (case-insensitive, partial match) */
export async function searchUsers(
  supabase: SupabaseClient,
  query: string,
): Promise<UserProfileSummary[]> {
  const sanitized = escapeLikePattern(query);
  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("id, email, display_name, avatar_url")
    .ilike("email", `%${sanitized}%`)
    .order("email")
    .limit(SEARCH_RESULTS_LIMIT);

  if (error) throw error;

  return (data ?? []) as unknown as UserProfileSummary[];
}

/** Get all granted (non-expired) permission keys for a user */
export async function getUserPermissionKeys(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(USER_PERMISSIONS_TABLE)
    .select("resource_permissions!inner(permissions!inner(key))")
    .eq("user_id", userId)
    .eq("mode", "grant")
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    resource_permissions: { permissions: { key: string } };
  }>;

  return rows.map((row) => row.resource_permissions.permissions.key);
}

/** Find the resource_permission id for a global-scope permission key */
async function findResourcePermissionId(
  supabase: SupabaseClient,
  permissionKey: string,
): Promise<string> {
  // First get the permission id by key
  const { data: permData, error: permError } = await supabase
    .from(PERMISSIONS_TABLE)
    .select("id")
    .eq("key", permissionKey)
    .single();

  if (permError) throw permError;
  const permissionId = (permData as unknown as { id: string }).id;

  // Then get the global-scope resource_permission
  const { data: rpData, error: rpError } = await supabase
    .from(RESOURCE_PERMISSIONS_TABLE)
    .select("id")
    .eq("permission_id", permissionId)
    .eq("resource_type", "global")
    .single();

  if (rpError) throw rpError;
  return (rpData as unknown as { id: string }).id;
}

/** Grant a permission to a user (upserts to handle duplicates) */
export async function grantPermission(
  supabase: SupabaseClient,
  userId: string,
  permissionKey: string,
  grantedBy: string,
): Promise<void> {
  const resourcePermissionId = await findResourcePermissionId(
    supabase,
    permissionKey,
  );

  const { error } = await supabase.from(USER_PERMISSIONS_TABLE).upsert(
    {
      user_id: userId,
      resource_permission_id: resourcePermissionId,
      mode: "grant",
      granted_by: grantedBy,
      reason: ADMIN_UI_GRANT_REASON,
    },
    { onConflict: "user_id,resource_permission_id" },
  );

  if (error) throw error;
}

/** Revoke a permission from a user */
export async function revokePermission(
  supabase: SupabaseClient,
  userId: string,
  permissionKey: string,
): Promise<void> {
  const resourcePermissionId = await findResourcePermissionId(
    supabase,
    permissionKey,
  );

  const { error } = await supabase
    .from(USER_PERMISSIONS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("resource_permission_id", resourcePermissionId);

  if (error) throw error;
}

/** Replace all permissions for a user with the given template keys */
export async function applyTemplate(
  supabase: SupabaseClient,
  userId: string,
  permissionKeys: string[],
  grantedBy: string,
): Promise<void> {
  // Delete all existing permissions for this user
  const { error: deleteError } = await supabase
    .from(USER_PERMISSIONS_TABLE)
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  // Grant each permission in the template
  await Promise.all(
    permissionKeys.map((key) =>
      grantPermission(supabase, userId, key, grantedBy),
    ),
  );
}
