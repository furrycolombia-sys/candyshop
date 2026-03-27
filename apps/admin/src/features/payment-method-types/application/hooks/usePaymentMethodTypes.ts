import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { PAYMENT_METHOD_TYPES_QUERY_KEY } from "@/features/payment-method-types/domain/constants";
import { fetchPaymentMethodTypes } from "@/features/payment-method-types/infrastructure/paymentMethodTypeQueries";

export function usePaymentMethodTypes() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [PAYMENT_METHOD_TYPES_QUERY_KEY],
    queryFn: () => fetchPaymentMethodTypes(supabase),
    staleTime: 30_000,
  });
}
