"use client";

import { useMutation } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import type { CartItem } from "@/features/checkout/domain/types";
import {
  createOrder,
  submitReceipt,
} from "@/features/checkout/infrastructure/checkoutQueries";
import { uploadReceipt } from "@/features/checkout/infrastructure/receiptStorage";

interface SubmitPaymentParams {
  userId: string;
  sellerId: string;
  paymentMethodId: string;
  items: CartItem[];
  totalCop: number;
  checkoutSessionId: string;
  transferNumber: string | null;
  receiptFile: File | null;
  buyerInfo: Record<string, string>;
}

/**
 * Mutation that:
 * 1. Creates the order (reserves stock)
 * 2. Uploads receipt to storage (if provided)
 * 3. Updates order with receipt URL + transfer number
 * Returns the order ID.
 */
export function useSubmitPayment() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: async (params: SubmitPaymentParams): Promise<string> => {
      const {
        userId,
        sellerId,
        paymentMethodId,
        items,
        totalCop,
        checkoutSessionId,
        transferNumber,
        receiptFile,
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

      // 2. Upload receipt if provided
      let receiptUrl: string | null = null;
      if (receiptFile) {
        receiptUrl = await uploadReceipt(supabase, receiptFile, orderId);
      }

      // 3. Submit receipt info and move to pending_verification
      await submitReceipt(
        supabase,
        orderId,
        transferNumber,
        receiptUrl,
        buyerInfo,
      );

      return orderId;
    },
  });
}
