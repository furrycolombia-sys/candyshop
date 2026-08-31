/* eslint-disable i18next/no-literal-string */
import { buildWorkbook, toCell, toNumberCell } from "shared";

import type { ReportOrder } from "@/features/reports/domain/types";

const ORDERS_HEADERS = [
  "Order ID",
  "Date",
  "Status",
  "Buyer Email",
  "Buyer Name",
  "Seller Email",
  "Seller Name",
  "Product",
  "Qty",
  "Unit Price",
  "Currency",
  "Order Total",
  "Transfer #",
  "Has Receipt",
  "Receipt URL",
] as const;

function buildOrderRow(
  order: ReportOrder,
  productName: string,
  qty: number,
  unitPrice: number,
  itemCurrency: string,
): string {
  const cells = [
    toCell(order.id),
    toCell(new Date(order.created_at).toLocaleString()),
    toCell(order.payment_status),
    toCell(order.buyer_email),
    toCell(order.buyer_display_name ?? ""),
    toCell(order.seller_email ?? ""),
    toCell(order.seller_display_name ?? ""),
    toCell(productName),
    toNumberCell(qty),
    toNumberCell(unitPrice),
    toCell(itemCurrency),
    toNumberCell(order.total),
    toCell(order.transfer_number ?? ""),
    toCell(order.receipt_url ? "Yes" : "No"),
    toCell(order.receipt_url ?? ""),
  ];
  return `<Row>${cells.join("")}</Row>`;
}

export function exportOrdersToExcel(orders: ReportOrder[]): string {
  const headerRow = `<Row>${ORDERS_HEADERS.map((h) => toCell(h)).join("")}</Row>`;

  const bodyRows = orders
    .flatMap((order) => {
      if (order.items.length === 0) {
        return [buildOrderRow(order, "", 0, 0, order.currency)];
      }
      return order.items.map((item) =>
        buildOrderRow(
          order,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.currency,
        ),
      );
    })
    .join("");

  return buildWorkbook([{ name: "Sales Report", rows: [headerRow, bodyRows] }]);
}

// Re-exported so call sites keep importing both helpers from one place.
export { downloadExcel } from "shared";
