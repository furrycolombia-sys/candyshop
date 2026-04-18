import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { fetchPaymentMethods } from "@/features/payment-methods/infrastructure/paymentMethodQueries";

/** Fetch the seller's configured payment methods (requires sellerId) */
export function usePaymentMethods(sellerId: string) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: ["payment-methods", sellerId],
    queryFn: () => fetchPaymentMethods(supabase, sellerId),
    enabled: !!sellerId,
  });
}
