"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "shared";

import type { CartItem } from "@/features/checkout/domain/types";
import { createOrder } from "@/features/checkout/infrastructure/checkoutQueries";
import { MY_ORDERS_QUERY_KEY } from "@/features/orders/domain/constants";
import { uploadCheckoutReceipt } from "@/shared/infrastructure/receiptActions";

interface SubmitPaymentParams {
  userId: string;
  sellerId: string;
  paymentMethodId: string;
  items: CartItem[];
  checkoutSessionId: string;
  buyerInfo: Record<string, string>;
  receiptFile: File | null;
  transferNumber: string | null;
}

/**
 * Mutation that:
 * 1. Generates an order ID client-side
 * 2. Uploads the receipt file (if any) using that ID
 * 3. Creates the order directly as pending_verification — no awaiting_payment row ever hits the DB
 * Returns the order ID.
 */
export function useSubmitPayment() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitPaymentParams): Promise<string> => {
      const {
        userId,
        sellerId,
        paymentMethodId,
        items,
        checkoutSessionId,
        buyerInfo,
        receiptFile,
        transferNumber,
      } = params;

      // 1. Upload receipt using the checkout session ID as the storage path prefix —
      //    lets the DB generate the order ID rather than pre-generating client-side
      let receiptUrl: string | null = null;
      if (receiptFile) {
        receiptUrl = await uploadCheckoutReceipt(
          checkoutSessionId,
          receiptFile,
        );
      }

      // 2. Create order with all payment info in a single insert; DB generates the order ID
      return createOrder(supabase, {
        userId,
        sellerId,
        paymentMethodId,
        items,
        checkoutSessionId,
        transferNumber,
        receiptUrl,
        buyerInfo,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [MY_ORDERS_QUERY_KEY] });
    },
  });
}
