/* eslint-disable i18next/no-literal-string -- route uses internal table names */
import { getCurrentUserId } from "api/supabase";
import { createServerSupabaseClient } from "api/supabase/server";
import { NextResponse } from "next/server";
import { ORDER_STATUS_SET } from "shared/constants/orders";
import { POPULAR_CURRENCIES_SET } from "shared/utils/currencies";

import type { SellerReportOrder } from "@/features/reports";
import type { SupabaseClient } from "@/shared/domain/types";
import {
  adminFetchJson,
  createRestPath,
} from "@/shared/infrastructure/adminRestClient";
import { getReceiptUrl } from "@/shared/infrastructure/receiptStorage";

const JSON_CONTENT_TYPE = "application/json";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidIsoDate(value: string): boolean {
  return ISO_DATE_REGEX.test(value) && !Number.isNaN(Date.parse(value));
}

function isValidAmount(value: string): boolean {
  const num = Number.parseFloat(value);
  return !Number.isNaN(num) && num >= 0;
}

type OrderRow = {
  id: string;
  created_at: string;
  payment_status: string;
  total: number;
  currency: string;
  transfer_number: string | null;
  receipt_url: string | null;
  user_id: string;
  order_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    currency: string;
    products: { name_en: string } | null;
  }>;
};

type UserProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
};

type BuildQueryResult =
  | { ok: true; query: Record<string, string | readonly string[]> }
  | { ok: false; error: string };

function applyDateFilters(
  query: Record<string, string>,
  params: URLSearchParams,
): string | null {
  const dateFrom = params.get("dateFrom");
  if (dateFrom) {
    if (!isValidIsoDate(dateFrom)) return "Invalid dateFrom";
    query["created_at"] = `gte.${dateFrom}`;
  }
  const dateTo = params.get("dateTo");
  if (dateTo) {
    if (!isValidIsoDate(dateTo)) return "Invalid dateTo";
    if (query["created_at"]) {
      query["created_at_lte"] = `lte.${dateTo}T23:59:59`;
    } else {
      query["created_at"] = `lte.${dateTo}T23:59:59`;
    }
  }
  return null;
}

function applyAmountFilters(
  query: Record<string, string>,
  params: URLSearchParams,
): string | null {
  const amountMin = params.get("amountMin");
  if (amountMin) {
    if (!isValidAmount(amountMin)) return "Invalid amountMin";
    query["total"] = `gte.${amountMin}`;
  }
  const amountMax = params.get("amountMax");
  if (amountMax) {
    if (!isValidAmount(amountMax)) return "Invalid amountMax";
    query[query["total"] ? "total_lte" : "total"] = `lte.${amountMax}`;
  }
  return null;
}

function applyScalarFilters(
  query: Record<string, string>,
  params: URLSearchParams,
): string | null {
  const status = params.get("status");
  if (status) {
    if (!ORDER_STATUS_SET.has(status)) return "Invalid status";
    query["payment_status"] = `eq.${status}`;
  }
  const buyerId = params.get("buyerId");
  if (buyerId) {
    if (!UUID_REGEX.test(buyerId)) return "Invalid buyerId";
    query["user_id"] = `eq.${buyerId}`;
  }
  const currency = params.get("currency");
  if (currency) {
    const normalized = currency.toUpperCase();
    if (!POPULAR_CURRENCIES_SET.has(normalized)) return "Invalid currency";
    query["currency"] = `eq.${normalized}`;
  }
  return null;
}

function buildQuery(
  sellerId: string,
  params: URLSearchParams,
): BuildQueryResult {
  const query: Record<string, string> = {
    seller_id: `eq.${sellerId}`,
    select:
      "id,created_at,payment_status,total,currency,transfer_number,receipt_url,user_id,order_items(id,product_id,quantity,unit_price,currency,products(name_en))",
    order: "created_at.desc",
  };

  const dateError = applyDateFilters(query, params);
  if (dateError) return { ok: false, error: dateError };

  const amountError = applyAmountFilters(query, params);
  if (amountError) return { ok: false, error: amountError };

  const scalarError = applyScalarFilters(query, params);
  if (scalarError) return { ok: false, error: scalarError };

  return { ok: true, query };
}

async function mapOrder(
  supabase: SupabaseClient,
  row: OrderRow,
  profileMap: Map<string, UserProfileRow>,
): Promise<SellerReportOrder> {
  const profile = profileMap.get(row.user_id);
  // receipt_url is a Supabase Storage path (e.g. "orderId/receipt.png"), not a
  // URL. The receipts bucket is private, so the browser can't load the path
  // directly — exchange it for a signed URL using the seller's session.
  let signedReceiptUrl: string | null = null;
  if (row.receipt_url) {
    try {
      signedReceiptUrl = await getReceiptUrl(supabase, row.receipt_url);
    } catch {
      signedReceiptUrl = null;
    }
  }
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
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.products?.name_en ?? item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency: item.currency,
    })),
  };
}

export async function GET(request: Request) {
  try {
    const sessionSupabase = await createServerSupabaseClient();
    const userId = await getCurrentUserId(sessionSupabase);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryResult = buildQuery(userId, searchParams);
    if (!queryResult.ok) {
      return NextResponse.json({ error: queryResult.error }, { status: 400 });
    }
    const path = createRestPath("orders", queryResult.query);
    const rows = await adminFetchJson<OrderRow[]>(path, {
      headers: { Accept: JSON_CONTENT_TYPE },
    });

    // Fetch buyer profiles separately (no FK from orders.user_id to user_profiles)
    const profileMap = new Map<string, UserProfileRow>();
    if (rows.length > 0) {
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const profilesPath = createRestPath("user_profiles", {
        id: `in.(${userIds.join(",")})`,
        select: "id,email,display_name",
      });
      const profiles = await adminFetchJson<UserProfileRow[]>(profilesPath, {
        headers: { Accept: JSON_CONTENT_TYPE },
      });
      for (const p of profiles) {
        profileMap.set(p.id, p);
      }
    }

    const orders = await Promise.all(
      rows.map((row) => mapOrder(sessionSupabase, row, profileMap)),
    );

    return NextResponse.json({ orders, total: orders.length });
  } catch (error) {
    console.error(
      "[seller/reports/orders]",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: "Failed to fetch seller reports" },
      { status: 500 },
    );
  }
}
