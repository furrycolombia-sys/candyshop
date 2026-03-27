/* eslint-disable i18next/no-literal-string -- infrastructure file: Supabase table/column names are SQL identifiers, not user-facing text */
import type { SupabaseClient } from "@/shared/domain/types";

/**
 * Resolve display names for a list of user IDs from the user_profiles table.
 * Returns a map of userId -> display name, using email as fallback.
 */
export async function fetchUserDisplayNames(
  supabase: SupabaseClient,
  userIds: string[],
  fallbackName: string,
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, display_name, email")
    .in("id", userIds);

  if (error) return {};

  const map: Record<string, string> = {};
  for (const profile of data ?? []) {
    map[profile.id] = profile.display_name ?? profile.email ?? fallbackName;
  }
  return map;
}
