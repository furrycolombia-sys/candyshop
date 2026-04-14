/* eslint-disable i18next/no-literal-string -- Supabase query params */
import type { createBrowserSupabaseClient } from "api/supabase";

import type { DelegateWithProfile } from "@/features/seller-admins/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
const SELLER_ADMINS_TABLE = "seller_admins" as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
const USER_PROFILES_TABLE = "user_profiles" as any;

const SEARCH_RESULTS_LIMIT = 10;

/** Escape SQL LIKE wildcards to prevent pattern injection */
export function escapeLikePattern(input: string): string {
  return input.replaceAll(/[%_\\]/g, (char) => `\\${char}`);
}

/**
 * Fetch all delegates for a seller, joined with their user profiles.
 * Results are ordered by `created_at` ascending.
 */
export async function fetchDelegates(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<DelegateWithProfile[]> {
  const { data, error } = await supabase
    .from(SELLER_ADMINS_TABLE)
    .select(
      "id, seller_id, admin_user_id, permissions, created_at, updated_at, admin_profile:user_profiles!admin_user_id(id, email, display_name, avatar_url)",
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as unknown as DelegateWithProfile[];
}

/**
 * Search user profiles by email or display_name, excluding a specific user.
 * The query string is sanitized against SQL LIKE injection.
 */
export async function searchUsers(
  supabase: SupabaseClient,
  query: string,
  excludeUserId: string,
): Promise<
  Array<{
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  }>
> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const sanitized = escapeLikePattern(trimmed);

  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("id, email, display_name, avatar_url")
    .neq("id", excludeUserId)
    .or(`email.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`)
    .limit(SEARCH_RESULTS_LIMIT);

  if (error) throw error;

  return (data ?? []) as unknown as Array<{
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  }>;
}
