"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { MY_ORDERS_QUERY_KEY } from "@/features/orders/domain/constants";
import { resubmitEvidence } from "@/features/orders/infrastructure/orderQueries";
import { uploadOrderReceipt } from "@/shared/infrastructure/receiptActions";

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
    mutationFn: async (params: ResubmitParams) => {
      let receiptUrl: string | null = null;
      if (params.receiptFile) {
        const uploadResult = await uploadOrderReceipt(
          params.orderId,
          params.receiptFile,
        );
        if (!uploadResult.ok) {
          throw new Error(uploadResult.code);
        }
        receiptUrl = uploadResult.path;
      }
      return resubmitEvidence(
        supabase,
        params.orderId,
        params.transferNumber,
        receiptUrl,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [MY_ORDERS_QUERY_KEY],
      });
    },
  });
}
