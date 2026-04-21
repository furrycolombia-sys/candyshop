/* eslint-disable i18next/no-literal-string */
import type {
  SellerReportFilters,
  SellerReportOrder,
} from "@/features/reports/domain/types";

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
  "Order Total",
  "Transfer #",
  "Has Receipt",
  "Receipt URL",
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

function buildOrderRow(
  order: SellerReportOrder,
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
    toNumberCell(order.total),
    toCell(order.transfer_number ?? ""),
    toCell(order.receipt_url ? "Yes" : "No"),
    toCell(order.receipt_url ?? ""),
  ];
  return `<Row>${cells.join("")}</Row>`;
}

function buildFiltersSheet(
  filters: SellerReportFilters,
  generatedAt: string,
): string {
  const rows = [
    `<Row>${toCell("Generated at")}${toCell(generatedAt)}</Row>`,
    `<Row>${toCell("Date from")}${toCell(filters.dateFrom ?? "—")}</Row>`,
    `<Row>${toCell("Date to")}${toCell(filters.dateTo ?? "—")}</Row>`,
    `<Row>${toCell("Status")}${toCell(filters.status ?? "All")}</Row>`,
    `<Row>${toCell("Currency")}${toCell(filters.currency ?? "All")}</Row>`,
    `<Row>${toCell("Amount min")}${toCell(filters.amountMin === null ? "—" : String(filters.amountMin))}</Row>`,
    `<Row>${toCell("Amount max")}${toCell(filters.amountMax === null ? "—" : String(filters.amountMax))}</Row>`,
  ];
  return `<Worksheet ss:Name="Filters"><Table>${rows.join("")}</Table></Worksheet>`;
}

export function buildExportFilename(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, ISO_DATE_LENGTH);
  const time = now
    .toISOString()
    .slice(ISO_DATE_LENGTH + 1, ISO_DATETIME_LENGTH)
    .replaceAll(":", "-");
  return `my-sales-report-${date}_${time}.xls`;
}

export function exportSellerOrdersToExcel(
  orders: SellerReportOrder[],
  filters: SellerReportFilters,
): string {
  const generatedAt = new Date().toLocaleString();

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

  const salesSheet = [
    '<Worksheet ss:Name="My Sales Report"><Table>',
    headerRow,
    bodyRows,
    "</Table></Worksheet>",
  ].join("");

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    salesSheet,
    buildFiltersSheet(filters, generatedAt),
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
