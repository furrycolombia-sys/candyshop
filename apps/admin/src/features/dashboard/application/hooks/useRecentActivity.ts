import { useQuery } from "@tanstack/react-query";

import { RECENT_ACTIVITY_QUERY_KEY } from "@/features/dashboard/domain/constants";
import { fetchRecentActivity } from "@/features/dashboard/infrastructure/recentActivityQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

const STALE_TIME_MS = 30_000;

export function useRecentActivity() {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [RECENT_ACTIVITY_QUERY_KEY],
    queryFn: () => fetchRecentActivity(supabase),
    staleTime: STALE_TIME_MS,
  });
}
