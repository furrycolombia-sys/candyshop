"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { SELLER_PROFILES_QUERY_KEY } from "@/features/checkout/domain/constants";
import { fetchSellerProfiles } from "@/features/checkout/infrastructure/checkoutQueries";

/**
 * Fetches display names for a list of seller IDs.
 * Returns a Record<sellerId, displayName>.
 */
export function useSellerProfiles(sellerIds: string[]) {
  const supabase = useSupabase();

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase is not serializable (circular refs)
    queryKey: [SELLER_PROFILES_QUERY_KEY, sellerIds],
    queryFn: () => fetchSellerProfiles(supabase, sellerIds),
    enabled: sellerIds.length > 0,
    staleTime: 60_000,
  });
}
