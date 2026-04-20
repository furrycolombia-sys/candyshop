import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { PAYMENT_METHODS_LIST_QUERY_KEY } from "@/features/payment-methods/domain/constants";
import { fetchPaymentMethods } from "@/features/payment-methods/infrastructure/paymentMethodQueries";

/** Fetch the seller's configured payment methods (requires sellerId) */
export function usePaymentMethods(sellerId: string) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [PAYMENT_METHODS_LIST_QUERY_KEY, sellerId],
    queryFn: () => fetchPaymentMethods(supabase, sellerId),
    enabled: !!sellerId,
    staleTime: 60_000,
  });
}
