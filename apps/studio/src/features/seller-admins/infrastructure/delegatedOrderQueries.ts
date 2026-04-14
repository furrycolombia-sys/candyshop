/* eslint-disable i18next/no-literal-string -- Supabase query params */
import type { createBrowserSupabaseClient } from "api/supabase";

import { ACTIONABLE_ORDER_STATUSES } from "@/features/seller-admins/domain/constants";
import type { DelegatedOrderContext } from "@/features/seller-admins/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
const SELLER_ADMINS_TABLE = "seller_admins" as any;

/**
 * Fetch actionable orders for all sellers who delegated to this user.
 *
 * Algorithm:
 * 1. Fetch all seller_admins rows where admin_user_id = delegateUserId
 * 2. For each delegation, fetch orders where seller_id matches and
 *    payment_status is in ACTIONABLE_ORDER_STATUSES
 * 3. Group results by seller with seller profile info
 */
export async function fetchDelegatedOrders(
  supabase: SupabaseClient,
  delegateUserId: string,
): Promise<Array<{ seller: DelegatedOrderContext; orders: unknown[] }>> {
  // Step 1: Fetch all delegations for this user
  const { data: delegations, error: delegationError } = await supabase
    .from(SELLER_ADMINS_TABLE)
    .select(
      "seller_id, permissions, seller_profile:user_profiles!seller_id(id, display_name)",
    )
    .eq("admin_user_id", delegateUserId);

  if (delegationError) throw delegationError;
  if (!delegations || delegations.length === 0) return [];

  const typedDelegations = delegations as unknown as Array<{
    seller_id: string;
    permissions: string[];
    seller_profile: { id: string; display_name: string | null };
  }>;

  // Step 2: For each delegation, fetch actionable orders
  const results = await Promise.all(
    typedDelegations.map(async (delegation) => {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", delegation.seller_id)
        .in("payment_status", [...ACTIONABLE_ORDER_STATUSES]);

      if (ordersError) throw ordersError;

      // Step 3: Group with seller context
      const seller: DelegatedOrderContext = {
        seller_id: delegation.seller_id,
        seller_display_name: delegation.seller_profile?.display_name ?? null,
        permissions:
          delegation.permissions as DelegatedOrderContext["permissions"],
      };

      return { seller, orders: orders ?? [] };
    }),
  );

  // Filter out sellers with no actionable orders
  return results.filter((group) => group.orders.length > 0);
}
