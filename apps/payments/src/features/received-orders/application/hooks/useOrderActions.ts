"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { RECEIVED_ORDERS_QUERY_KEY } from "@/features/received-orders/domain/constants";
import type { SellerAction } from "@/features/received-orders/domain/types";
import { updateOrderStatus } from "@/features/received-orders/infrastructure/receivedOrderQueries";

interface OrderActionParams {
  orderId: string;
  action: SellerAction;
  sellerNote?: string;
}

export function useOrderActions() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, action, sellerNote }: OrderActionParams) => {
      await updateOrderStatus(supabase, orderId, action, sellerNote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [RECEIVED_ORDERS_QUERY_KEY],
      });
    },
  });
}
