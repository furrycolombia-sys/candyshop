/* eslint-disable i18next/no-literal-string -- Supabase query params */
import type { createBrowserSupabaseClient } from "api/supabase";

import type { DelegateWithProfile } from "@/features/seller-admins/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

const SEARCH_RESULTS_LIMIT = 10;

/** Escape SQL LIKE wildcards to prevent pattern injection */
export function escapeLikePattern(input: string): string {
  return input.replaceAll(/[%_\\]/g, (char) => `\\${char}`);
}

/**
 * Fetch all delegates for a seller scoped to a specific product,
 * joined with their user profiles.
 * Results are ordered by `created_at` ascending.
 */
export async function fetchDelegates(
  supabase: SupabaseClient,
  sellerId: string,
  productId: string,
): Promise<DelegateWithProfile[]> {
  const { data, error } = await supabase
    .from("seller_admins")
    .select(
      "id, seller_id, admin_user_id, product_id, permissions, created_at, updated_at, admin_profile:user_profiles!admin_user_id(id, email, display_name, avatar_url)",
    )
    .eq("seller_id", sellerId)
    .eq("product_id", productId)
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
    .from("user_profiles")
    .select("id, email, display_name, avatar_url")
    .neq("id", excludeUserId)
    .or(`email.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`)
    .limit(SEARCH_RESULTS_LIMIT);

  if (error) throw error;

  return data ?? [];
}

/**
 * Fetch delegate counts grouped by product for a seller.
 * Returns a `Record<string, number>` mapping each `product_id` to its delegate count.
 */
export async function fetchDelegateCountsByProduct(
  supabase: SupabaseClient,
  sellerId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("seller_admins")
    .select("product_id")
    .eq("seller_id", sellerId);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const pid = (row as { product_id: string }).product_id;
    counts[pid] = (counts[pid] ?? 0) + 1;
  }

  return counts;
}
