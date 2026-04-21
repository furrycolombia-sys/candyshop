/* eslint-disable i18next/no-literal-string -- route uses internal table names */
import { createServerSupabaseClient } from "api/supabase/server";
import { NextResponse } from "next/server";

import type { SellerReportOrder } from "@/features/reports/domain/types";
import {
  adminFetchJson,
  createRestPath,
} from "@/shared/infrastructure/adminRestClient";

type OrderRow = {
  id: string;
  created_at: string;
  payment_status: string;
  total: number;
  currency: string;
  transfer_number: string | null;
  receipt_url: string | null;
  user_id: string;
  user_profiles: { email: string; display_name: string | null } | null;
  order_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    currency: string;
    products: { name: string } | null;
  }>;
};

function buildQuery(
  sellerId: string,
  params: URLSearchParams,
): Record<string, string | readonly string[]> {
  const query: Record<string, string> = {
    seller_id: `eq.${sellerId}`,
    select:
      "id,created_at,payment_status,total,currency,transfer_number,receipt_url,user_id,user_profiles(email,display_name),order_items(id,product_id,quantity,unit_price,currency,products(name))",
    order: "created_at.desc",
  };

  const dateFrom = params.get("dateFrom");
  if (dateFrom) query["created_at"] = `gte.${dateFrom}`;

  const dateTo = params.get("dateTo");
  if (dateTo) {
    const existing = query["created_at"];
    if (existing) {
      // Both from and to: use range
      query["created_at"] = `gte.${dateFrom}`;
      query["created_at_lte"] = `lte.${dateTo}T23:59:59`;
    } else {
      query["created_at"] = `lte.${dateTo}T23:59:59`;
    }
  }

  const status = params.get("status");
  if (status) query["payment_status"] = `eq.${status}`;

  const buyerId = params.get("buyerId");
  if (buyerId) query["user_id"] = `eq.${buyerId}`;

  const currency = params.get("currency");
  if (currency) query["currency"] = `eq.${currency}`;

  const amountMin = params.get("amountMin");
  if (amountMin) query["total"] = `gte.${amountMin}`;

  const amountMax = params.get("amountMax");
  if (amountMax) {
    const existing = query["total"];
    if (existing) {
      query["total_lte"] = `lte.${amountMax}`;
    } else {
      query["total"] = `lte.${amountMax}`;
    }
  }

  return query;
}

function mapOrder(row: OrderRow): SellerReportOrder {
  return {
    id: row.id,
    created_at: row.created_at,
    payment_status: row.payment_status as SellerReportOrder["payment_status"],
    total: row.total,
    currency: row.currency,
    transfer_number: row.transfer_number,
    receipt_url: row.receipt_url,
    buyer_id: row.user_id,
    buyer_email: row.user_profiles?.email ?? "",
    buyer_display_name: row.user_profiles?.display_name ?? null,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.products?.name ?? item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency: item.currency,
    })),
  };
}

export async function GET(request: Request) {
  try {
    const sessionSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await sessionSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = buildQuery(user.id, searchParams);
    const path = createRestPath("orders", query);
    const rows = await adminFetchJson<OrderRow[]>(path, {
      headers: { Accept: "application/json" },
    });

    const orders = rows.map((row) => mapOrder(row));

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
