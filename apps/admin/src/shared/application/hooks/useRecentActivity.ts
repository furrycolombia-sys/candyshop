import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "@/shared/application/hooks/useSupabase";
import { fetchRecentActivity } from "@/shared/infrastructure/recentActivityQueries";

const RECENT_ACTIVITY_QUERY_KEY = "recent-activity";
const STALE_TIME_MS = 30_000;

export function useRecentActivity() {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [RECENT_ACTIVITY_QUERY_KEY],
    queryFn: () => fetchRecentActivity(supabase),
    staleTime: STALE_TIME_MS,
  });
}
