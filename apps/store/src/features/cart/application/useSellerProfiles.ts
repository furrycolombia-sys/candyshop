"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import type { SellerProfile } from "@/features/cart/domain/types";

/**
 * Fetches display names for a list of seller IDs from user_profiles.
 * Returns a map of sellerId -> displayName.
 *
 * Note: user_profiles is not yet in the generated Database types,
 * so we use the Supabase REST API directly via fetch.
 */
export function useSellerProfiles(sellerIds: string[]) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const uniqueIds = [...new Set(sellerIds.filter(Boolean))];

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: ["seller-profiles", uniqueIds],
    queryFn: async () => {
      if (uniqueIds.length === 0) return {};

      // user_profiles is not yet in the generated Database types
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
        .from("user_profiles" as any)
        .select("id, display_name, email")
        .in("id", uniqueIds);

      if (error) throw new Error(error.message);

      const map: Record<string, string> = {};
      for (const profile of (data ?? []) as unknown as SellerProfile[]) {
        map[profile.id] = profile.display_name ?? profile.email.split("@")[0];
      }
      return map;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 60_000,
  });
}
