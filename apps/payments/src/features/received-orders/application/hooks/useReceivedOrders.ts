"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import {
  RECEIVED_ORDERS_QUERY_KEY,
  RECEIVED_ORDERS_STALE_TIME_MS,
} from "@/features/received-orders/domain/constants";
import { fetchReceivedOrders } from "@/features/received-orders/infrastructure/receivedOrderQueries";

export function useReceivedOrders(filter?: string) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is not serializable and is stable (memoized above)
    queryKey: [RECEIVED_ORDERS_QUERY_KEY, filter],
    queryFn: () => fetchReceivedOrders(supabase, filter),
    staleTime: RECEIVED_ORDERS_STALE_TIME_MS,
  });
}
