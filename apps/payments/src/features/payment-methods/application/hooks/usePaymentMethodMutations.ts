import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "shared";

import type {
  CreatePaymentMethodParams,
  UpdatePaymentMethodParams,
} from "@/features/payment-methods/domain/types";
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
  const supabase = useSupabase();

  return useMutation({
    mutationFn: ({ sellerId, nameEn, nameEs }: CreatePaymentMethodParams) =>
      createPaymentMethod(supabase, sellerId, nameEn, nameEs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENT_METHODS_KEY] });
    },
  });
}

/** Update a payment method; invalidates ['payment-methods'] */
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: ({ id, patch }: UpdatePaymentMethodParams) =>
      updatePaymentMethod(supabase, id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENT_METHODS_KEY] });
    },
  });
}

/** Delete a payment method; invalidates ['payment-methods'] */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  return useMutation({
    mutationFn: (id: string) => deletePaymentMethod(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENT_METHODS_KEY] });
    },
  });
}
