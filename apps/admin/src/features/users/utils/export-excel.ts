/* eslint-disable i18next/no-literal-string */
import type { UserProfileSummary } from "@/features/users/domain/types";

export async function exportUsersToExcel(users: UserProfileSummary[]) {
  const xlsx = await import("xlsx");

  // Convert the user list to a flat array of objects suitable for Excel
  const data = users.map((u) => ({
    ID: u.id,
    Email: u.email,
    "Display Name": u.display_name ?? "",
    "Last Seen": u.last_seen_at
      ? new Date(u.last_seen_at).toLocaleString()
      : "Never",
  }));

  // Create a new workbook and add the worksheet
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Users");

  // Return the workbook for the caller to handle I/O
  return workbook;
}
