"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

interface SellerInfo {
  displayName: string;
  avatarUrl: string | null;
}

export function useSellerInfo(sellerId: string | null) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: ["seller-info", sellerId],
    queryFn: async (): Promise<SellerInfo> => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, display_name, email, display_avatar_url, avatar_url")
        .eq("id", sellerId as string)
        .single();

      if (error) throw new Error(error.message);

      return {
        displayName:
          data.display_name ?? data.email.split("@")[0] ?? data.email,
        avatarUrl: data.display_avatar_url ?? data.avatar_url ?? null,
      };
    },
    enabled: sellerId !== null,
    staleTime: 60_000,
  });
}
