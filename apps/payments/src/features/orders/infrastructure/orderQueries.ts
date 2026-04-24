/* eslint-disable i18next/no-literal-string -- infrastructure file: Supabase table/column names are SQL identifiers, not user-facing text */
import type { OrderWithItems } from "@/features/orders/domain/types";
import { FALLBACK_SELLER_NAME } from "@/shared/domain/constants";
import type { OrderRow, SupabaseClient } from "@/shared/domain/types";
import { fetchUserDisplayNames } from "@/shared/infrastructure/fetchUserDisplayNames";
import { getReceiptUrl } from "@/shared/infrastructure/receiptStorage";

interface BuyerOrderRow extends OrderRow {
  payment_method_id: string | null;
}

export async function fetchMyOrders(
  supabase: SupabaseClient,
): Promise<OrderWithItems[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw authError ?? new Error("Not authenticated");

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as BuyerOrderRow[];

  const sellerIds = [
    ...new Set(
      rows.map((r) => r.seller_id).filter((id): id is string => id !== null),
    ),
  ];

  const sellerNames = await fetchUserDisplayNames(
    supabase,
    sellerIds,
    FALLBACK_SELLER_NAME,
  );

  // Batch all signed-URL requests in parallel instead of one per row (N+1 fix)
  const receiptPaths = rows
    .map((r) => r.receipt_url)
    .filter((p): p is string => p !== null && p !== undefined);

  const signedUrls = await Promise.all(
    receiptPaths.map((path) => getReceiptUrl(supabase, path)),
  );

  const urlByPath: Record<string, string | null> = Object.fromEntries(
    receiptPaths.map((path, i) => [path, signedUrls[i]]),
  );

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    seller_id: row.seller_id,
    payment_status: row.payment_status as OrderWithItems["payment_status"],
    total: row.total,
    currency: row.currency,
    transfer_number: row.transfer_number,
    receipt_url: row.receipt_url ? (urlByPath[row.receipt_url] ?? null) : null,
    seller_note: row.seller_note,
    expires_at: row.expires_at,
    checkout_session_id: row.checkout_session_id,
    created_at: row.created_at,
    payment_method_id: row.payment_method_id,
    items: row.order_items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency: item.currency,
      metadata: item.metadata,
    })),
    seller_name: row.seller_id
      ? (sellerNames[row.seller_id] ?? FALLBACK_SELLER_NAME)
      : FALLBACK_SELLER_NAME,
  }));
}

export async function resubmitEvidence(
  supabase: SupabaseClient,
  orderId: string,
  transferNumber: string,
  receiptUrl: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({
      transfer_number: transferNumber,
      ...(receiptUrl ? { receipt_url: receiptUrl } : {}),
      payment_status: "pending_verification",
    })
    .eq("id", orderId)
    .eq("payment_status", "evidence_requested");

  if (error) throw error;
}
