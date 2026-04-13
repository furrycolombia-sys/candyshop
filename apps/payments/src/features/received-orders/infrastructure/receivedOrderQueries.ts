/* eslint-disable i18next/no-literal-string -- infrastructure file: Supabase table/column names are SQL identifiers, not user-facing text */
import { getReceiptUrl } from "@/features/checkout/infrastructure/receiptStorage";
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

/**
 * Fetch orders where the current user is the seller.
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
    .select(
      `
      id,
      user_id,
      seller_id,
      payment_status,
      total_cop,
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
        unit_price_cop,
        metadata
      )
    `,
    )
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

  // Resolve buyer names
  const buyerIds = [...new Set(rows.map((r) => r.user_id))];
  const buyerMap = await fetchUserDisplayNames(
    supabase,
    buyerIds,
    FALLBACK_BUYER_NAME,
  );

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      user_id: row.user_id,
      seller_id: row.seller_id,
      payment_status: row.payment_status as ReceivedOrder["payment_status"],
      total_cop: row.total_cop,
      transfer_number: row.transfer_number,
      receipt_url: await getReceiptUrl(supabase, row.receipt_url),
      seller_note: row.seller_note,
      buyer_info:
        (row as unknown as { buyer_info: Record<string, string> | null })
          .buyer_info ?? null,
      expires_at: row.expires_at,
      checkout_session_id: row.checkout_session_id,
      created_at: row.created_at,
      buyer_name: buyerMap[row.user_id] ?? FALLBACK_BUYER_NAME,
      items: row.order_items as OrderItem[],
    })),
  );
}

/**
 * Call the update_order_status RPC for seller actions.
 *
 * Note: This RPC is defined in the migrations but not yet in the generated
 * Supabase types. We use a direct PostgREST call to invoke it.
 */
export async function updateOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  newStatus: SellerAction,
  sellerNote?: string,
): Promise<void> {
  // The update_order_status RPC is not in the generated Supabase types yet,
  // so we call it via the generic rpc method with a type assertion.
  const { error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: Error | null }>;
    }
  ).rpc("update_order_status", {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_seller_note: sellerNote ?? null,
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
