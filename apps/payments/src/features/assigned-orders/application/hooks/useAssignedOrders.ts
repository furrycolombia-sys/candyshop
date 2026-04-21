"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { ASSIGNED_ORDERS_QUERY_KEY } from "@/features/assigned-orders/domain/constants";
import { fetchAssignedOrders } from "@/features/received-orders/infrastructure/receivedOrderQueries";

const ASSIGNED_ORDERS_STALE_TIME_MS = 30_000;

export function useAssignedOrders() {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [ASSIGNED_ORDERS_QUERY_KEY],
    queryFn: () => fetchAssignedOrders(supabase),
    staleTime: ASSIGNED_ORDERS_STALE_TIME_MS,
  });
}
