"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { fetchSellerProfiles } from "@/features/checkout/infrastructure/checkoutQueries";

/**
 * Fetches display names for a list of seller IDs.
 * Returns a Record<sellerId, displayName>.
 */
export function useSellerProfiles(sellerIds: string[]) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase is not serializable (circular refs)
    queryKey: ["seller-profiles", sellerIds],
    queryFn: () => fetchSellerProfiles(supabase, sellerIds),
    enabled: sellerIds.length > 0,
  });
}
