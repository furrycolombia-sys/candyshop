/* eslint-disable i18next/no-literal-string */
import type { UserProfileSummary } from "@/features/users/domain/types";

export type UserPermissionsById = Record<string, string[]>;
export interface ReceiptBackup {
  userId: string;
  orderId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  fileBase64: string;
}

const RECEIPT_PERMISSION_KEYS = [
  "receipts.create",
  "receipts.read",
  "receipts.delete",
] as const;

function toYesNo(hasPermission: boolean): "Yes" | "No" {
  return hasPermission ? "Yes" : "No";
}

const EXCEL_HEADERS = [
  "ID",
  "Email",
  "Display Name",
  "Last Seen",
  "Receipts Create",
  "Receipts Read",
  "Receipts Delete",
] as const;
const RECEIPT_HEADERS = [
  "User ID",
  "Order ID",
  "Storage Path",
  "File Name",
  "MIME Type",
  "File Size (bytes)",
  "Receipt File (base64)",
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

export function exportUsersToExcel(
  users: UserProfileSummary[],
  permissionsByUserId: UserPermissionsById,
  receipts: ReceiptBackup[] = [],
): string {
  const headerRow = `<Row>${EXCEL_HEADERS.map((header) => toCell(header)).join("")}</Row>`;
  const bodyRows = users
    .map((user) => {
      const permissionKeys = permissionsByUserId[user.id] ?? [];
      const values = [
        user.id,
        user.email,
        user.display_name ?? "",
        user.last_seen_at
          ? new Date(user.last_seen_at).toLocaleString()
          : "Never",
        toYesNo(permissionKeys.includes(RECEIPT_PERMISSION_KEYS[0])),
        toYesNo(permissionKeys.includes(RECEIPT_PERMISSION_KEYS[1])),
        toYesNo(permissionKeys.includes(RECEIPT_PERMISSION_KEYS[2])),
      ];

      return `<Row>${values.map((value) => toCell(value)).join("")}</Row>`;
    })
    .join("");

  const receiptHeaderRow = `<Row>${RECEIPT_HEADERS.map((header) => toCell(header)).join("")}</Row>`;
  const receiptRows = receipts
    .map((receipt) => {
      const values = [
        receipt.userId,
        receipt.orderId,
        receipt.storagePath,
        receipt.fileName,
        receipt.mimeType,
        String(receipt.byteSize),
        receipt.fileBase64,
      ];
      return `<Row>${values.map((value) => toCell(value)).join("")}</Row>`;
    })
    .join("");

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Worksheet ss:Name="Users"><Table>',
    headerRow,
    bodyRows,
    WORKSHEET_CLOSE,
    '<Worksheet ss:Name="Receipts"><Table>',
    receiptHeaderRow,
    receiptRows,
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
