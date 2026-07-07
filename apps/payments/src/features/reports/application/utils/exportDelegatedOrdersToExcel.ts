/* eslint-disable i18next/no-literal-string */
import type { DelegatedReportOrder } from "@/features/reports/domain/types";

// downloadExcel is generic (blob + anchor click); reuse it rather than duplicate.
export { downloadExcel } from "@/features/reports/application/utils/exportSellerOrdersToExcel";

const ORDERS_HEADERS = [
  "Order ID",
  "Date",
  "Status",
  "Buyer Email",
  "Buyer Name",
  "Product",
  "Qty",
  "Unit Price",
  "Currency",
  "Delegated Subtotal",
] as const;

const ISO_DATE_LENGTH = 10;
const ISO_DATETIME_LENGTH = 19;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toCell(value: string): string {
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function toNumberCell(value: number): string {
  return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
}

function buildOrderItemRow(
  order: DelegatedReportOrder,
  productName: string,
  qty: number,
  unitPrice: number,
  itemCurrency: string,
): string {
  const cells = [
    toCell(order.id),
    toCell(order.created_at ? new Date(order.created_at).toLocaleString() : ""),
    toCell(order.payment_status),
    toCell(order.buyer_email),
    toCell(order.buyer_display_name ?? ""),
    toCell(productName),
    toNumberCell(qty),
    toNumberCell(unitPrice),
    toCell(itemCurrency),
    toNumberCell(order.delegated_subtotal),
  ];
  return `<Row>${cells.join("")}</Row>`;
}

export function buildDelegatedExportFilename(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, ISO_DATE_LENGTH);
  const time = now
    .toISOString()
    .slice(ISO_DATE_LENGTH + 1, ISO_DATETIME_LENGTH)
    .replaceAll(":", "-");
  return `delegated-report-${date}_${time}.xls`;
}

export function exportDelegatedOrdersToExcel(
  orders: DelegatedReportOrder[],
): string {
  const headerRow = `<Row>${ORDERS_HEADERS.map((h) => toCell(h)).join("")}</Row>`;

  const bodyRows = orders
    .flatMap((order) => {
      if (order.items.length === 0) {
        return [buildOrderItemRow(order, "", 0, 0, order.currency)];
      }
      return order.items.map((item) =>
        buildOrderItemRow(
          order,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.currency,
        ),
      );
    })
    .join("");

  const salesSheet = [
    '<Worksheet ss:Name="Delegated Report"><Table>',
    headerRow,
    bodyRows,
    "</Table></Worksheet>",
  ].join("");

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    salesSheet,
    "</Workbook>",
  ].join("");
}
