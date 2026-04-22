/* eslint-disable i18next/no-literal-string */
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import {
  buildSalesWorkbook,
  CONTENT_TYPE_XLSX,
  type OrderItemRow,
  type OrderRow,
  type UserProfileRow,
} from "./buildSalesWorkbook";

import {
  adminFetch,
  createRestPath,
  FORBIDDEN_ERROR,
  getAuthorizedAdmin,
  INTERNAL_SERVER_ERROR_STATUS,
} from "@/app/api/admin/_shared/adminRest";

const ADMIN_REPORTS = "admin.reports";
const MAX_LIMIT = 10_000;
const ISO_DATE_LENGTH = 10;
const ORDERS_SELECT =
  "id,created_at,payment_status,total,currency,transfer_number,receipt_url,user_id,seller_id,buyer_info";
const ITEMS_SELECT =
  "id,order_id,product_id,quantity,unit_price,currency,products(name_en)";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  return ISO_DATE_REGEX.test(value) && !Number.isNaN(Date.parse(value));
}

function isValidAmount(value: string): boolean {
  const num = Number.parseFloat(value);
  return !Number.isNaN(num) && num >= 0;
}

function addDateFilters(
  filters: Record<string, string>,
  dateFrom: string | null,
  dateTo: string | null,
): void {
  const validFrom = dateFrom && isValidIsoDate(dateFrom) ? dateFrom : null;
  const validTo = dateTo && isValidIsoDate(dateTo) ? dateTo : null;
  if (validFrom && validTo) {
    const end = new Date(validTo);
    end.setDate(end.getDate() + 1);
    filters["created_at"] = `gte.${validFrom}`;
    filters["and"] =
      `(created_at.lt.${end.toISOString().slice(0, ISO_DATE_LENGTH)})`;
  } else if (validFrom) {
    filters["created_at"] = `gte.${validFrom}`;
  } else if (validTo) {
    const end = new Date(validTo);
    end.setDate(end.getDate() + 1);
    filters["created_at"] = `lt.${end.toISOString().slice(0, ISO_DATE_LENGTH)}`;
  }
}

function addAmountFilters(
  filters: Record<string, string>,
  amountMin: string | null,
  amountMax: string | null,
): void {
  const validMin = amountMin && isValidAmount(amountMin) ? amountMin : null;
  const validMax = amountMax && isValidAmount(amountMax) ? amountMax : null;
  if (validMin && validMax) {
    filters["total"] = `gte.${validMin}`;
    const existing = filters["and"] ?? "";
    filters["and"] = existing
      ? `${existing},(total.lte.${validMax})`
      : `(total.lte.${validMax})`;
  } else if (validMin) {
    filters["total"] = `gte.${validMin}`;
  } else if (validMax) {
    filters["total"] = `lte.${validMax}`;
  }
}

function buildOrderFilters(
  searchParams: URLSearchParams,
): Record<string, string> {
  const filters: Record<string, string> = {};
  addDateFilters(
    filters,
    searchParams.get("dateFrom"),
    searchParams.get("dateTo"),
  );
  addAmountFilters(
    filters,
    searchParams.get("amountMin"),
    searchParams.get("amountMax"),
  );
  const status = searchParams.get("status");
  const sellerId = searchParams.get("sellerId");
  const buyerId = searchParams.get("buyerId");
  const currency = searchParams.get("currency");
  if (status) filters["payment_status"] = `eq.${status}`;
  if (sellerId) filters["seller_id"] = `eq.${sellerId}`;
  if (buyerId) filters["user_id"] = `eq.${buyerId}`;
  if (currency) filters["currency"] = `eq.${currency}`;
  return filters;
}

async function fetchOrderItems(
  orderIds: string[],
  productId: string | null,
): Promise<OrderItemRow[]> {
  const itemsQuery: Record<string, string> = {
    select: ITEMS_SELECT,
    order_id: `in.(${orderIds.join(",")})`,
  };
  if (productId) itemsQuery["product_id"] = `eq.${productId}`;
  const response = await adminFetch(createRestPath("order_items", itemsQuery));
  return response.json() as Promise<OrderItemRow[]>;
}

async function fetchProfileMap(
  userIds: string[],
): Promise<Map<string, UserProfileRow>> {
  if (userIds.length === 0) return new Map();
  const response = await adminFetch(
    createRestPath("user_profiles", {
      select: "id,email,display_name",
      id: `in.(${userIds.join(",")})`,
    }),
  );
  const profiles = (await response.json()) as UserProfileRow[];
  return new Map(profiles.map((p) => [p.id, p]));
}

function buildXlsxResponse(buffer: ExcelJS.Buffer, date: string): Response {
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPE_XLSX,
      "Content-Disposition": `attachment; filename="sales-report-${date}.xlsx"`,
    },
  });
}

async function buildEmptyExcelResponse(): Promise<Response> {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Sales Report").addRow(["No orders found"]);
  const buffer = await workbook.xlsx.writeBuffer();
  return buildXlsxResponse(
    buffer,
    new Date().toISOString().slice(0, ISO_DATE_LENGTH),
  );
}

export async function GET(request: Request) {
  const adminUserId = await getAuthorizedAdmin([ADMIN_REPORTS]);
  if (!adminUserId) {
    return NextResponse.json({ error: FORBIDDEN_ERROR }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = buildOrderFilters(searchParams);
    const productId = searchParams.get("productId");

    const ordersResponse = await adminFetch(
      createRestPath("orders", {
        select: ORDERS_SELECT,
        order: "created_at.desc",
        limit: String(MAX_LIMIT),
        ...filters,
      }),
    );
    let orders = (await ordersResponse.json()) as OrderRow[];

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) return buildEmptyExcelResponse();

    const allItems = await fetchOrderItems(orderIds, productId);

    if (productId) {
      const withProduct = new Set(allItems.map((i) => i.order_id));
      orders = orders.filter((o) => withProduct.has(o.id));
    }

    const userIdSet = new Set<string>();
    for (const order of orders) {
      userIdSet.add(order.user_id);
      if (order.seller_id) userIdSet.add(order.seller_id);
    }
    const profileMap = await fetchProfileMap([...userIdSet]);

    const itemsByOrder = new Map<string, OrderItemRow[]>();
    for (const item of allItems) {
      const existing = itemsByOrder.get(item.order_id) ?? [];
      existing.push(item);
      itemsByOrder.set(item.order_id, existing);
    }

    const workbook = await buildSalesWorkbook(orders, profileMap, itemsByOrder);
    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, ISO_DATE_LENGTH);
    return buildXlsxResponse(buffer, date);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate sales report" },
      { status: INTERNAL_SERVER_ERROR_STATUS },
    );
  }
}
