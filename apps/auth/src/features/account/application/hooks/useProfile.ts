import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { PROFILE_QUERY_KEY } from "@/features/account/domain/constants";
import { fetchProfile } from "@/features/account/infrastructure/profileQueries";

export function useProfile(userId: string | undefined) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [PROFILE_QUERY_KEY, userId],
    queryFn: () => {
      if (!userId) throw new Error("User ID is required");
      return fetchProfile(supabase, userId);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
