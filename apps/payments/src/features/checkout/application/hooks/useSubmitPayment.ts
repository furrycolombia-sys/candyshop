"use client";

import { useMutation } from "@tanstack/react-query";
import { useSupabase } from "shared";

import type { CartItem } from "@/features/checkout/domain/types";
import {
  createOrder,
  submitReceipt,
} from "@/features/checkout/infrastructure/checkoutQueries";
import { uploadReceipt } from "@/shared/infrastructure/receiptStorage";

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
        checkoutSessionId,
        buyerInfo,
        receiptFile,
        transferNumber,
      } = params;

      // 1. Create order and reserve stock
      const orderId = await createOrder(supabase, {
        userId,
        sellerId,
        paymentMethodId,
        items,
        checkoutSessionId,
      });

      // 2. Upload receipt file if provided
      let receiptPath: string | null = null;
      if (receiptFile) {
        receiptPath = await uploadReceipt(supabase, receiptFile, orderId);
      }

      // 3. Submit buyer info and move to pending_verification
      await submitReceipt(
        supabase,
        orderId,
        transferNumber,
        receiptPath,
        buyerInfo,
      );

      return orderId;
    },
  });
}
