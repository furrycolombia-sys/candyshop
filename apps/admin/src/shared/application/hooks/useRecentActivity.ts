import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { fetchRecentActivity } from "@/shared/infrastructure/recentActivityQueries";

const RECENT_ACTIVITY_QUERY_KEY = "recent-activity";
const STALE_TIME_MS = 30_000;

export function useRecentActivity() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is not serializable and is stable (memoized above)
    queryKey: [RECENT_ACTIVITY_QUERY_KEY],
    queryFn: () => fetchRecentActivity(supabase),
    staleTime: STALE_TIME_MS,
  });
}
