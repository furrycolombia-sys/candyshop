/* eslint-disable i18next/no-literal-string -- infrastructure file: Supabase table/column names are SQL identifiers, not user-facing text */
import type {
  ReceivedOrder,
  SellerAction,
} from "@/features/received-orders/domain/types";
import { FALLBACK_BUYER_NAME } from "@/shared/domain/constants";
import type {
  OrderItem,
  OrderRow,
  SupabaseClient,
} from "@/shared/domain/types";
import { fetchUserDisplayNames } from "@/shared/infrastructure/fetchUserDisplayNames";
import { getReceiptUrl } from "@/shared/infrastructure/receiptStorage";

const ORDER_SELECT = `
  id,
  user_id,
  seller_id,
  payment_status,
  total,
  currency,
  transfer_number,
  receipt_url,
  seller_note,
  buyer_info,
  expires_at,
  checkout_session_id,
  created_at,
  order_items (
    id,
    product_id,
    quantity,
    unit_price,
    currency,
    metadata
  )
`;

async function mapRowToOrder(
  row: OrderRow,
  buyerMap: Record<string, string>,
  sellerName: string | null,
  canManage?: boolean,
): Promise<ReceivedOrder> {
  return {
    id: row.id,
    user_id: row.user_id,
    seller_id: row.seller_id,
    payment_status: row.payment_status as ReceivedOrder["payment_status"],
    total: row.total,
    currency: row.currency,
    transfer_number: row.transfer_number,
    receipt_url: await getReceiptUrl(row.receipt_url),
    seller_note: row.seller_note,
    buyer_info:
      typeof row.buyer_info === "object" && !Array.isArray(row.buyer_info)
        ? (row.buyer_info as Record<string, string> | null)
        : null,
    expires_at: row.expires_at,
    checkout_session_id: row.checkout_session_id,
    created_at: row.created_at,
    buyer_name: buyerMap[row.user_id] ?? FALLBACK_BUYER_NAME,
    items: row.order_items as OrderItem[],
    seller_name: sellerName,
    can_manage: canManage,
  };
}

/**
 * Fetch all orders from sellers who delegated to `userId`, together with
 * seller display names and per-seller management permissions.
 */
async function fetchDelegatedOrderRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  rows: OrderRow[];
  sellerNameMap: Record<string, string>;
  sellerPermissionsMap: Record<string, string[]>;
}> {
  const { data: delegations, error: delegationsError } = await supabase
    .from("seller_admins")
    .select("seller_id, permissions")
    .eq("admin_user_id", userId);

  if (delegationsError) throw delegationsError;

  const delegationRows = delegations ?? [];

  if (delegationRows.length === 0) {
    return { rows: [], sellerNameMap: {}, sellerPermissionsMap: {} };
  }

  const delegatedSellerIds = delegationRows.map((d) => d.seller_id);

  const sellerPermissionsMap: Record<string, string[]> = {};
  for (const d of delegationRows) {
    sellerPermissionsMap[d.seller_id] = (d.permissions as string[]) ?? [];
  }

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .in("seller_id", delegatedSellerIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as OrderRow[];

  const sellerNameMap =
    rows.length > 0
      ? await fetchUserDisplayNames(supabase, delegatedSellerIds, "Seller")
      : {};

  return { rows, sellerNameMap, sellerPermissionsMap };
}

/**
 * Fetch all orders delegated to the current user via seller_admins.
 * Each order carries `can_manage` based on the delegate's permissions for
 * that seller (requires orders.approve or orders.request_proof).
 */
export async function fetchAssignedOrders(
  supabase: SupabaseClient,
): Promise<ReceivedOrder[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { rows, sellerNameMap, sellerPermissionsMap } =
    await fetchDelegatedOrderRows(supabase, user.id);

  if (rows.length === 0) return [];

  const buyerIds = [...new Set(rows.map((r) => r.user_id))];
  const buyerMap = await fetchUserDisplayNames(
    supabase,
    buyerIds,
    FALLBACK_BUYER_NAME,
  );

  return Promise.all(
    rows.map((row) => {
      const permissions = sellerPermissionsMap[row.seller_id ?? ""] ?? [];
      const canManage =
        permissions.includes("orders.approve") ||
        permissions.includes("orders.request_proof");
      return mapRowToOrder(
        row,
        buyerMap,
        sellerNameMap[row.seller_id ?? ""] ?? "Seller",
        canManage,
      );
    }),
  );
}

/**
 * Fetch orders where the current user is the seller (own orders only).
 * Delegated orders are shown separately on the /assigned page.
 * Optionally filters by payment_status.
 */
export async function fetchReceivedOrders(
  supabase: SupabaseClient,
  filter?: string,
): Promise<ReceivedOrder[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (filter && filter !== "all") {
    query = query.eq(
      "payment_status",
      filter as
        | "pending_verification"
        | "evidence_requested"
        | "approved"
        | "rejected"
        | "expired",
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as OrderRow[];
  const buyerIds = [...new Set(rows.map((r) => r.user_id))];
  const buyerMap = await fetchUserDisplayNames(
    supabase,
    buyerIds,
    FALLBACK_BUYER_NAME,
  );

  return Promise.all(rows.map((row) => mapRowToOrder(row, buyerMap, null)));
}

/** Call the update_order_status RPC for seller actions. */
export async function updateOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  newStatus: SellerAction,
  sellerNote?: string,
): Promise<void> {
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_seller_note: sellerNote,
  });

  if (error) throw error;
}

/**
 * Fetch pending order count for the current user as seller.
 */
export async function fetchPendingOrderCount(
  supabase: SupabaseClient,
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", user.id)
    .in("payment_status", [
      "pending_verification" as const,
      "evidence_requested" as const,
    ]);

  if (error) return 0;
  return count ?? 0;
}
