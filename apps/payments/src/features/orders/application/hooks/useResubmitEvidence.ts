"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { MY_ORDERS_QUERY_KEY } from "@/features/orders/domain/constants";
import { resubmitEvidence } from "@/features/orders/infrastructure/orderQueries";

interface ResubmitParams {
  orderId: string;
  transferNumber: string;
  receiptFile: File | null;
}

/**
 * Mutation to resubmit payment evidence after a seller requests it.
 * Invalidates the orders query on success.
 */
export function useResubmitEvidence() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ResubmitParams) =>
      resubmitEvidence(
        supabase,
        params.orderId,
        params.transferNumber,
        params.receiptFile,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [MY_ORDERS_QUERY_KEY],
      });
    },
  });
}
