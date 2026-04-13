/* eslint-disable i18next/no-literal-string */
import type { UserProfileSummary } from "@/features/users/domain/types";

export function exportUsersToCsv(users: UserProfileSummary[]): string {
  if (users.length === 0) return "";

  const headers = ["ID", "Email", "Display Name", "Last Seen"];

  const rows = users.map((u) => [
    u.id,
    u.email,
    u.display_name ?? "",
    u.last_seen_at ? new Date(u.last_seen_at).toLocaleString() : "Never",
  ]);

  const escapeCell = (cell: string | number) => {
    const stringValue = String(cell);
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replaceAll('"', '""')}"`;
    }
    return stringValue;
  };

  return [
    headers.map((h) => escapeCell(h)).join(","),
    ...rows.map((row) => row.map((c) => escapeCell(c)).join(",")),
  ].join("\n");
}

export function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
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
