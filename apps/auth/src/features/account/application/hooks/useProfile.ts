import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import {
  PROFILE_QUERY_KEY,
  PROFILE_STALE_TIME_MS,
} from "@/features/account/domain/constants";
import { fetchProfile } from "@/features/account/infrastructure/profileQueries";

export function useProfile(userId: string | undefined) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [PROFILE_QUERY_KEY, userId],
    queryFn: () => {
      if (!userId) throw new Error("User ID is required");
      return fetchProfile(supabase, userId);
    },
    enabled: !!userId,
    staleTime: PROFILE_STALE_TIME_MS,
  });
}
