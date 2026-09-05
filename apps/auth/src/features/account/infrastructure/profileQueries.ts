import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProfileFormValues,
  UserProfile,
} from "@/features/account/domain/types";

/**
 * Columns readable by the client. Deliberately excludes identity_sub, which
 * anon/authenticated no longer have SELECT on (see migration
 * 20260829160000_protect_identity_sub_select.sql) — a bare `select("*")`
 * would fail for this role once that column is off-limits.
 */
const PROFILE_SELECT_COLUMNS =
  "id, email, avatar_url, provider, display_name, display_email, display_avatar_url, first_seen_at, last_seen_at";

/** Fetch the current user's profile */
export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as UserProfile;
}

/** Update the current user's display fields */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  values: ProfileFormValues,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .update(values)
    .eq("id", userId)
    .select(PROFILE_SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data as UserProfile;
}
