import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { SELLER_ADMINS_QUERY_KEY } from "@/features/seller-admins/domain/constants";
import { fetchDelegates } from "@/features/seller-admins/infrastructure/delegateQueries";

export function useDelegates(sellerId?: string) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [SELLER_ADMINS_QUERY_KEY, sellerId],
    queryFn: () => fetchDelegates(supabase, sellerId ?? ""),
    enabled: !!sellerId,
  });
}
