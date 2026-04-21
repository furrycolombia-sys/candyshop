/* eslint-disable i18next/no-literal-string */
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

const WORKSHEET_CLOSE = "</Table></Worksheet>";

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

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Worksheet ss:Name="Sales Report"><Table>',
    headerRow,
    bodyRows,
    WORKSHEET_CLOSE,
    "</Workbook>",
  ].join("");
}

export function downloadExcel(content: string, filename: string) {
  const blob = new Blob([content], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
