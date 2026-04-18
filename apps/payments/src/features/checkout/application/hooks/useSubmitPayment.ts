"use client";

import { useMutation } from "@tanstack/react-query";
import { useSupabase } from "shared";

import type { CartItem } from "@/features/checkout/domain/types";
import {
  createOrder,
  submitReceipt,
} from "@/features/checkout/infrastructure/checkoutQueries";

interface SubmitPaymentParams {
  userId: string;
  sellerId: string;
  paymentMethodId: string;
  items: CartItem[];
  totalCop: number;
  checkoutSessionId: string;
  /** Key = FormField.id, value = string (file fields store the Supabase Storage URL) */
  buyerInfo: Record<string, string>;
}

/**
 * Mutation that:
 * 1. Creates the order (reserves stock)
 * 2. Submits buyer info and moves to pending_verification
 * Returns the order ID.
 */
export function useSubmitPayment() {
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async (params: SubmitPaymentParams): Promise<string> => {
      const {
        userId,
        sellerId,
        paymentMethodId,
        items,
        totalCop,
        checkoutSessionId,
        buyerInfo,
      } = params;

      // 1. Create order and reserve stock
      const orderId = await createOrder(supabase, {
        userId,
        sellerId,
        paymentMethodId,
        items,
        totalCop,
        checkoutSessionId,
      });

      // 2. Submit buyer info and move to pending_verification
      // File fields store URLs (uploaded client-side); transfer_number and receipt_url are null
      await submitReceipt(supabase, orderId, null, null, buyerInfo);

      return orderId;
    },
  });
}
