import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { PAYMENT_METHODS_QUERY_KEY } from "@/features/payment-methods/domain/constants";
import {
  fetchPaymentMethods,
  fetchSellerPaymentMethods,
} from "@/features/payment-methods/infrastructure/paymentMethodQueries";

/** Fetch the seller's configured payment methods (new API — requires sellerId) */
export function usePaymentMethods(sellerId: string) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: ["payment-methods", sellerId],
    queryFn: () => fetchPaymentMethods(supabase, sellerId),
    enabled: !!sellerId,
  });
}

/** Fetch the seller's configured payment methods (legacy — reads seller from auth session) */
export function useSellerPaymentMethods() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [PAYMENT_METHODS_QUERY_KEY],
    queryFn: () => fetchSellerPaymentMethods(supabase),
  });
}
