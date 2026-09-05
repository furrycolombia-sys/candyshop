/* eslint-disable i18next/no-literal-string */
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import {
  buildSalesWorkbook,
  CONTENT_TYPE_XLSX,
  type OrderRow,
} from "./buildSalesWorkbook";

import {
  adminFetch,
  createRestPath,
  FORBIDDEN_ERROR,
  getAuthorizedAdmin,
  INTERNAL_SERVER_ERROR_STATUS,
} from "@/app/api/admin/_shared/adminRest";
import {
  fetchOrderItems,
  fetchProfileMap,
  type OrderItemRow,
} from "@/app/api/admin/_shared/reportsData";
import { buildAdminOrderFilters } from "@/app/api/admin/_shared/reportsFilters";

const ADMIN_REPORTS = "admin.reports";
const MAX_LIMIT = 10_000;
const ISO_DATE_LENGTH = 10;
const ORDERS_SELECT =
  "id,created_at,payment_status,total,currency,transfer_number,receipt_url,user_id,seller_id,buyer_info";

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
    const filters = buildAdminOrderFilters(searchParams);
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
