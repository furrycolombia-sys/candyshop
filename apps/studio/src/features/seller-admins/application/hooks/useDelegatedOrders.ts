import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";
import { DELEGATED_ORDERS_QUERY_KEY } from "@/features/seller-admins/domain/constants";
import { fetchDelegatedOrders } from "@/features/seller-admins/infrastructure/delegatedOrderQueries";

export function useDelegatedOrders() {
  const { user } = useSupabaseAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const userId = user?.id;

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [DELEGATED_ORDERS_QUERY_KEY, userId],
    queryFn: () => fetchDelegatedOrders(supabase, userId ?? ""),
    enabled: !!userId,
  });
}
