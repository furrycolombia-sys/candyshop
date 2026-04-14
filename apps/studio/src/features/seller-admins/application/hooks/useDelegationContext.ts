/* eslint-disable i18next/no-literal-string -- Supabase query params */
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "api/supabase";
import { useCallback, useMemo } from "react";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";
import { SELLER_ADMINS_QUERY_KEY } from "@/features/seller-admins/domain/constants";
import type {
  DelegatedOrderContext,
  DelegatePermission,
} from "@/features/seller-admins/domain/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
const SELLER_ADMINS_TABLE = "seller_admins" as any;

async function fetchDelegationContext(
  supabase: ReturnType<typeof createBrowserSupabaseClient>,
  userId: string,
): Promise<DelegatedOrderContext[]> {
  const { data, error } = await supabase
    .from(SELLER_ADMINS_TABLE)
    .select(
      "seller_id, permissions, seller_profile:user_profiles!seller_id(id, display_name)",
    )
    .eq("admin_user_id", userId);

  if (error) throw error;

  return (
    (data ?? []) as unknown as Array<{
      seller_id: string;
      permissions: DelegatePermission[];
      seller_profile: { id: string; display_name: string | null };
    }>
  ).map((row) => ({
    seller_id: row.seller_id,
    seller_display_name: row.seller_profile?.display_name ?? null,
    permissions: row.permissions,
  }));
}

export interface UseDelegationContextReturn {
  delegations: DelegatedOrderContext[];
  isLoading: boolean;
  isDelegateFor: (sellerId: string) => boolean;
  canApprove: (sellerId: string) => boolean;
  canRequestProof: (sellerId: string) => boolean;
}

export function useDelegationContext(): UseDelegationContextReturn {
  const { user } = useSupabaseAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const userId = user?.id;

  const { data: delegations = [], isLoading } = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable (memoized)
    queryKey: [SELLER_ADMINS_QUERY_KEY, "context", userId],
    queryFn: () => fetchDelegationContext(supabase, userId ?? ""),
    enabled: !!userId,
  });

  const isDelegateFor = useCallback(
    (sellerId: string) => delegations.some((d) => d.seller_id === sellerId),
    [delegations],
  );

  const canApprove = useCallback(
    (sellerId: string) =>
      delegations.some(
        (d) =>
          d.seller_id === sellerId && d.permissions.includes("orders.approve"),
      ),
    [delegations],
  );

  const canRequestProof = useCallback(
    (sellerId: string) =>
      delegations.some(
        (d) =>
          d.seller_id === sellerId &&
          d.permissions.includes("orders.request_proof"),
      ),
    [delegations],
  );

  return { delegations, isLoading, isDelegateFor, canApprove, canRequestProof };
}
