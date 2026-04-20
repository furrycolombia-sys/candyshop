"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { PENDING_ORDER_COUNT_QUERY_KEY } from "@/features/orders/domain/constants";
import { fetchPendingOrderCount } from "@/features/orders/infrastructure/pendingOrderCount";

/** Stale time for pending order count (30 seconds) */
const STALE_TIME_MS = 30_000;

/** Poll interval for pending order count (60 seconds) */
const REFETCH_INTERVAL_MS = 60_000;

export function usePendingOrderCount() {
  const supabase = useSupabase();

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is not serializable and is stable (memoized above)
    queryKey: [PENDING_ORDER_COUNT_QUERY_KEY],
    queryFn: () => fetchPendingOrderCount(supabase),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
}
