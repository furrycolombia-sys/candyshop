import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import type { SellerPaymentMethod } from "@/features/payment-methods/domain/types";
import {
  createPaymentMethod,
  deletePaymentMethod,
  updatePaymentMethod,
} from "@/features/payment-methods/infrastructure/paymentMethodQueries";

const PAYMENT_METHODS_KEY = "payment-methods";

// ─── New hooks (task 6) ───────────────────────────────────────────────────────

/** Create a new payment method; invalidates ['payment-methods'] */
export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: ({
      sellerId,
      nameEn,
      nameEs,
    }: {
      sellerId: string;
      nameEn: string;
      nameEs?: string;
    }) => createPaymentMethod(supabase, sellerId, nameEn, nameEs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENT_METHODS_KEY] });
    },
  });
}

/** Update a payment method; invalidates ['payment-methods'] */
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<
        Pick<
          SellerPaymentMethod,
          | "name_en"
          | "name_es"
          | "display_blocks"
          | "form_fields"
          | "is_active"
          | "sort_order"
        >
      >;
    }) => updatePaymentMethod(supabase, id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENT_METHODS_KEY] });
    },
  });
}

/** Delete a payment method; invalidates ['payment-methods'] */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: (id: string) => deletePaymentMethod(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENT_METHODS_KEY] });
    },
  });
}
