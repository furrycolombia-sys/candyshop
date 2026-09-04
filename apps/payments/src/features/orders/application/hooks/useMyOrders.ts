"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { ORDERS_STALE_TIME_MS } from "@/features/orders/domain/constants";
import { fetchMyOrders } from "@/features/orders/infrastructure/orderQueries";
import { MY_ORDERS_QUERY_KEY } from "@/shared/domain/queryKeys";

/**
 * Fetches the authenticated user's orders with items and seller names.
 */
export function useMyOrders() {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [MY_ORDERS_QUERY_KEY],
    queryFn: () => fetchMyOrders(supabase),
    staleTime: ORDERS_STALE_TIME_MS,
  });
}
