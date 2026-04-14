import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";
import {
  DELEGATED_ORDERS_QUERY_KEY,
  SELLER_ADMINS_QUERY_KEY,
} from "@/features/seller-admins/domain/constants";
import type { OrderAction } from "@/features/seller-admins/domain/types";
import { executeDelegateAction } from "@/features/seller-admins/infrastructure/delegatedOrderActions";

export function useDelegateOrderActions() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { user } = useSupabaseAuth();

  return useMutation({
    mutationFn: (action: OrderAction) =>
      executeDelegateAction(supabase, user?.id ?? "", action),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [DELEGATED_ORDERS_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [SELLER_ADMINS_QUERY_KEY],
      });
    },
  });
}
