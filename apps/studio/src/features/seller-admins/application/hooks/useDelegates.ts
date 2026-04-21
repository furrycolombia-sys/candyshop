import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { SELLER_ADMINS_QUERY_KEY } from "@/features/seller-admins/domain/constants";
import { fetchDelegates } from "@/features/seller-admins/infrastructure/delegateQueries";

export function useDelegates(sellerId?: string, productId?: string) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [SELLER_ADMINS_QUERY_KEY, sellerId, productId],
    queryFn: () => fetchDelegates(supabase, sellerId ?? "", productId ?? ""),
    enabled: !!sellerId && !!productId,
    staleTime: 60_000,
  });
}
