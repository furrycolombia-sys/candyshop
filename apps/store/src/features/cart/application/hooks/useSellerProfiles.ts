"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { SELLER_PROFILES_QUERY_KEY } from "@/features/cart/domain/constants";

/**
 * Fetches display names for a list of seller IDs from user_profiles.
 * Returns a map of sellerId -> displayName.
 */
export function useSellerProfiles(sellerIds: string[]) {
  const supabase = useSupabase();
  const uniqueIds = [...new Set(sellerIds.filter(Boolean))];

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase is not serializable (circular refs)
    queryKey: [SELLER_PROFILES_QUERY_KEY, uniqueIds],
    queryFn: async () => {
      if (uniqueIds.length === 0) return {};

      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, display_name, email")
        .in("id", uniqueIds);

      if (error) throw new Error(error.message);

      const map: Record<string, string> = {};
      for (const profile of data ?? []) {
        map[profile.id] = profile.display_name ?? profile.email.split("@")[0];
      }
      return map;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 60_000,
  });
}
