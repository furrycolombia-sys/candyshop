/* eslint-disable i18next/no-literal-string -- Supabase query params */
import type { createBrowserSupabaseClient } from "api/supabase";

import { ACTIONABLE_ORDER_STATUSES } from "@/features/seller-admins/domain/constants";
import type {
  DelegatePermission,
  OrderAction,
} from "@/features/seller-admins/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
const SELLER_ADMINS_TABLE = "seller_admins" as any;

/** Map action type to the required delegate permission */
const ACTION_PERMISSION_MAP: Record<OrderAction["action"], DelegatePermission> =
  {
    approve: "orders.approve",
    request_proof: "orders.request_proof",
  };

/**
 * Execute a delegate action on an order with full permission checking.
 *
 * Algorithm:
 * 1. Fetch the order to get seller_id and verify actionable status
 * 2. Verify delegation exists and has required permission
 * 3. Update order status (approved or evidence_requested with seller_note)
 */
export async function executeDelegateAction(
  supabase: SupabaseClient,
  delegateUserId: string,
  action: OrderAction,
): Promise<void> {
  // Step 1: Fetch the target order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, seller_id, payment_status")
    .eq("id", action.orderId)
    .single();

  if (orderError || !order) {
    throw new Error("Order not found");
  }

  const typedOrder = order as unknown as {
    id: string;
    seller_id: string;
    payment_status: string;
  };

  // Step 2: Verify order is in an actionable state
  if (
    !ACTIONABLE_ORDER_STATUSES.includes(
      typedOrder.payment_status as (typeof ACTIONABLE_ORDER_STATUSES)[number],
    )
  ) {
    throw new Error("Order is not in an actionable state");
  }

  // Step 3: Verify delegation exists and has required permission
  const requiredPermission = ACTION_PERMISSION_MAP[action.action];

  const { data: delegation, error: delegationError } = await supabase
    .from(SELLER_ADMINS_TABLE)
    .select("permissions")
    .eq("admin_user_id", delegateUserId)
    .eq("seller_id", typedOrder.seller_id)
    .single();

  if (delegationError || !delegation) {
    throw new Error("No delegation found for this seller");
  }

  const typedDelegation = delegation as unknown as {
    permissions: DelegatePermission[];
  };

  if (!typedDelegation.permissions.includes(requiredPermission)) {
    throw new Error(`Missing required permission: ${requiredPermission}`);
  }

  // Step 4: Execute the action
  if (action.action === "approve") {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "approved" })
      .eq("id", action.orderId);

    if (error) throw error;
  } else {
    if (!action.seller_note?.trim()) {
      throw new Error("Seller note is required when requesting proof");
    }

    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "evidence_requested",
        seller_note: action.seller_note.trim(),
      })
      .eq("id", action.orderId);

    if (error) throw error;
  }
}
