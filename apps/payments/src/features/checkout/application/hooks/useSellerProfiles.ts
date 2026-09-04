"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { fetchSellerProfiles } from "@/features/checkout/infrastructure/checkoutQueries";
import { SELLER_PROFILES_QUERY_KEY } from "@/shared/domain/queryKeys";

/**
 * Fetches display names for a list of seller IDs.
 * Returns a Record<sellerId, displayName>.
 */
export function useSellerProfiles(sellerIds: string[]) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [SELLER_PROFILES_QUERY_KEY, sellerIds],
    queryFn: () => fetchSellerProfiles(supabase, sellerIds),
    enabled: sellerIds.length > 0,
    staleTime: 60_000,
  });
}
