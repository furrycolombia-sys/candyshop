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
    queryKey: ["seller-profiles", sellerIds, supabase],
    queryFn: () => fetchSellerProfiles(supabase, sellerIds),
    enabled: sellerIds.length > 0,
  });
}
