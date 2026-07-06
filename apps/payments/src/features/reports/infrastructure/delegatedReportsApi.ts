/* eslint-disable i18next/no-literal-string -- infrastructure: Supabase identifiers, not user-facing text */
import type { Database } from "api/supabase/types";

import type {
  SellerReportFilters,
  SellerReportOrder,
  SellerReportOrdersResponse,
} from "@/features/reports/domain/types";
import type { SupabaseClient } from "@/shared/domain/types";
import { getReceiptUrl } from "@/shared/infrastructure/receiptStorage";

const REPORTS_READ = "reports.read";

// Single string literal (not concatenated) so Postgrest's generic select-type
// inference can parse it; string concatenation via `+` widens to `string`
// and breaks the type-level column extraction.
const ORDER_SELECT =
  "id,seller_id,user_id,created_at,payment_status,total,currency,transfer_number,receipt_url,order_items(id,product_id,quantity,unit_price,currency,products(name_en))";

type CurrencyCode = Database["public"]["Enums"]["currency_code"];

const END_OF_DAY = "T23:59:59";

type DelegationRow = {
  seller_id: string;
  product_id: string;
  permissions: string[] | null;
};

type ItemRow = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  currency: string;
  products: { name_en: string } | null;
};

type OrderRow = {
  id: string;
  seller_id: string;
  user_id: string;
  created_at: string;
  payment_status: string;
  total: number;
  currency: string;
  transfer_number: string | null;
  receipt_url: string | null;
  order_items: ItemRow[];
};

type ProfileRow = { id: string; email: string; display_name: string | null };

/**
 * Map (seller_id -> set of delegated product_ids) for delegations that grant
 * reports.read. Only these products may appear in the delegate's report.
 */
function buildDelegatedProductMap(
  rows: DelegationRow[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!(row.permissions ?? []).includes(REPORTS_READ)) continue;
    const set = map.get(row.seller_id) ?? new Set<string>();
    set.add(row.product_id);
    map.set(row.seller_id, set);
  }
  return map;
}

function mapItem(item: ItemRow): SellerReportOrder["items"][number] {
  return {
    id: item.id,
    product_id: item.product_id,
    product_name: item.products?.name_en ?? item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    currency: item.currency,
  };
}

async function mapOrder(
  supabase: SupabaseClient,
  row: OrderRow,
  delegatedProductIds: Set<string>,
  profileMap: Map<string, ProfileRow>,
): Promise<SellerReportOrder | null> {
  const items = row.order_items
    .filter((item) => delegatedProductIds.has(item.product_id))
    .map((item) => mapItem(item));
  if (items.length === 0) return null;

  let signedReceiptUrl: string | null = null;
  if (row.receipt_url) {
    try {
      signedReceiptUrl = await getReceiptUrl(supabase, row.receipt_url);
    } catch {
      signedReceiptUrl = null;
    }
  }

  const profile = profileMap.get(row.user_id);
  return {
    id: row.id,
    created_at: row.created_at,
    payment_status: row.payment_status as SellerReportOrder["payment_status"],
    total: row.total,
    currency: row.currency,
    transfer_number: row.transfer_number,
    receipt_url: signedReceiptUrl,
    buyer_id: row.user_id,
    buyer_email: profile?.email ?? "",
    buyer_display_name: profile?.display_name ?? null,
    items,
  };
}

export async function fetchDelegatedReportOrders(
  supabase: SupabaseClient,
  filters: SellerReportFilters,
): Promise<SellerReportOrdersResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { orders: [], total: 0 };

  const { data: delegations } = await supabase
    .from("seller_admins")
    .select("seller_id, product_id, permissions")
    .eq("admin_user_id", user.id);

  const productMap = buildDelegatedProductMap(
    (delegations ?? []) as DelegationRow[],
  );
  if (productMap.size === 0) return { orders: [], total: 0 };

  const sellerIds = [...productMap.keys()];

  let query = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .in("seller_id", sellerIds)
    .order("created_at", { ascending: false });

  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo)
    query = query.lte("created_at", `${filters.dateTo}${END_OF_DAY}`);
  if (filters.status) query = query.eq("payment_status", filters.status);
  if (filters.buyerId) query = query.eq("user_id", filters.buyerId);
  if (filters.currency)
    query = query.eq(
      "currency",
      filters.currency.toUpperCase() as CurrencyCode,
    );
  if (filters.amountMin != null) query = query.gte("total", filters.amountMin);
  if (filters.amountMax != null) query = query.lte("total", filters.amountMax);

  const { data: orderData } = await query;
  const rows = (orderData ?? []) as OrderRow[];
  if (rows.length === 0) return { orders: [], total: 0 };

  const buyerIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, email, display_name")
    .in("id", buyerIds);

  const profileMap = new Map<string, ProfileRow>();
  for (const p of (profiles ?? []) as ProfileRow[]) profileMap.set(p.id, p);

  const mapped = await Promise.all(
    rows.map((row) =>
      mapOrder(
        supabase,
        row,
        productMap.get(row.seller_id) ?? new Set<string>(),
        profileMap,
      ),
    ),
  );
  const orders = mapped.filter((o): o is SellerReportOrder => o !== null);

  return { orders, total: orders.length };
}
