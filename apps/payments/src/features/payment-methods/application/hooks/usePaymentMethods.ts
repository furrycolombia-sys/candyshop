import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import {
  PAYMENT_METHODS_QUERY_KEY,
  PAYMENT_TYPES_QUERY_KEY,
} from "@/features/payment-methods/domain/constants";
import {
  fetchPaymentMethodTypes,
  fetchSellerPaymentMethods,
} from "@/features/payment-methods/infrastructure/paymentMethodQueries";

/** Fetch the admin-defined catalog of payment method types */
export function usePaymentMethodTypes() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [PAYMENT_TYPES_QUERY_KEY],
    queryFn: () => fetchPaymentMethodTypes(supabase),
  });
}

/** Fetch the seller's configured payment methods */
export function useSellerPaymentMethods() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [PAYMENT_METHODS_QUERY_KEY],
    queryFn: () => fetchSellerPaymentMethods(supabase),
  });
}
