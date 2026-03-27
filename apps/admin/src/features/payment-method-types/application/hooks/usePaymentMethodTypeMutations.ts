import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { PAYMENT_METHOD_TYPES_QUERY_KEY } from "@/features/payment-method-types/domain/constants";
import type { PaymentMethodTypeFormValues } from "@/features/payment-method-types/domain/types";
import {
  deletePaymentMethodType,
  insertPaymentMethodType,
  togglePaymentMethodTypeActive,
  updatePaymentMethodType,
} from "@/features/payment-method-types/infrastructure/paymentMethodTypeQueries";

export function useInsertPaymentMethodType() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: (values: PaymentMethodTypeFormValues) =>
      insertPaymentMethodType(supabase, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PAYMENT_METHOD_TYPES_QUERY_KEY],
      });
    },
  });
}

export function useUpdatePaymentMethodType() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Partial<PaymentMethodTypeFormValues>;
    }) => updatePaymentMethodType(supabase, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PAYMENT_METHOD_TYPES_QUERY_KEY],
      });
    },
  });
}

export function useDeletePaymentMethodType() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: (id: string) => deletePaymentMethodType(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PAYMENT_METHOD_TYPES_QUERY_KEY],
      });
    },
  });
}

export function useTogglePaymentMethodTypeActive() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      togglePaymentMethodTypeActive(supabase, id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PAYMENT_METHOD_TYPES_QUERY_KEY],
      });
    },
  });
}
