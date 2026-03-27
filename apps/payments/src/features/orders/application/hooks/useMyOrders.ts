"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import {
  MY_ORDERS_QUERY_KEY,
  ORDERS_STALE_TIME_MS,
} from "@/features/orders/domain/constants";
import { fetchMyOrders } from "@/features/orders/infrastructure/orderQueries";

/**
 * Fetches the authenticated user's orders with items and seller names.
 */
export function useMyOrders() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is not serializable and is stable (memoized above)
    queryKey: [MY_ORDERS_QUERY_KEY],
    queryFn: () => fetchMyOrders(supabase),
    staleTime: ORDERS_STALE_TIME_MS,
  });
}
