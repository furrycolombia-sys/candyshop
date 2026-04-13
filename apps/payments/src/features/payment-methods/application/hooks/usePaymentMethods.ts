import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { fetchPaymentMethods } from "@/features/payment-methods/infrastructure/paymentMethodQueries";

/** Fetch the seller's configured payment methods (requires sellerId) */
export function usePaymentMethods(sellerId: string) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: ["payment-methods", sellerId],
    queryFn: () => fetchPaymentMethods(supabase, sellerId),
    enabled: !!sellerId,
  });
}
