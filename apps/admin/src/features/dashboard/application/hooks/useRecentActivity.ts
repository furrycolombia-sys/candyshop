import { useQuery } from "@tanstack/react-query";

import { RECENT_ACTIVITY_QUERY_KEY } from "@/features/dashboard/domain/constants";
import { fetchRecentActivity } from "@/features/dashboard/infrastructure/recentActivityQueries";

const STALE_TIME_MS = 30_000;

export function useRecentActivity() {
  return useQuery({
    queryKey: [RECENT_ACTIVITY_QUERY_KEY],
    queryFn: () => fetchRecentActivity(),
    staleTime: STALE_TIME_MS,
  });
}
