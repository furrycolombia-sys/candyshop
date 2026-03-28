import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { PAYMENT_METHODS_QUERY_KEY } from "@/features/payment-methods/domain/constants";
import type { SellerPaymentMethodFormValues } from "@/features/payment-methods/domain/types";
import {
  deleteSellerPaymentMethod,
  insertSellerPaymentMethod,
  toggleSellerPaymentMethodActive,
  updateSellerPaymentMethod,
} from "@/features/payment-methods/infrastructure/paymentMethodQueries";

export function useInsertSellerPaymentMethod() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: (values: SellerPaymentMethodFormValues) =>
      insertSellerPaymentMethod(supabase, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENT_METHODS_QUERY_KEY] });
    },
  });
}

export function useUpdateSellerPaymentMethod() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: SellerPaymentMethodFormValues;
    }) => updateSellerPaymentMethod(supabase, id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENT_METHODS_QUERY_KEY] });
    },
  });
}

export function useDeleteSellerPaymentMethod() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: (id: string) => deleteSellerPaymentMethod(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENT_METHODS_QUERY_KEY] });
    },
  });
}

export function useToggleSellerPaymentMethodActive() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleSellerPaymentMethodActive(supabase, id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENT_METHODS_QUERY_KEY] });
    },
  });
}
