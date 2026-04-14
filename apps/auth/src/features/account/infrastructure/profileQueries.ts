import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProfileFormValues,
  UserProfile,
} from "@/features/account/domain/types";

/** Fetch the current user's profile */
export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
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
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}
