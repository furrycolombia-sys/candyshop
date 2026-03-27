"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

interface SellerProfile {
  id: string;
  display_name: string | null;
  email: string;
}

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

      // Use rpc-style query since user_profiles isn't in generated types yet
      const { data, error } = await (
        supabase as unknown as {
          from: (table: string) => {
            select: (columns: string) => {
              in: (
                column: string,
                values: string[],
              ) => Promise<{
                data: SellerProfile[] | null;
                error: { message: string } | null;
              }>;
            };
          };
        }
      )
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
