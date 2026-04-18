import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { SELLER_ADMINS_QUERY_KEY } from "@/features/seller-admins/domain/constants";
import { fetchDelegateCountsByProduct } from "@/features/seller-admins/infrastructure/delegateQueries";

const DELEGATE_COUNTS_KEY = "delegate-counts";

export function useDelegateCountsByProduct(sellerId?: string) {
  const supabase = useSupabase();

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [SELLER_ADMINS_QUERY_KEY, DELEGATE_COUNTS_KEY, sellerId],
    queryFn: () => fetchDelegateCountsByProduct(supabase, sellerId ?? ""),
    enabled: !!sellerId,
  });
}
