import { describe, it, expect, vi } from "vitest";
import * as xlsx from "xlsx";

import { exportUsersToExcel } from "./export-excel";

import type { UserProfileSummary } from "@/features/users/domain/types";

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe("exportUsersToExcel", () => {
  it("should format users and export them to an excel file", () => {
    const mockUsers: UserProfileSummary[] = [
      {
        id: "1",
        email: "test@example.com",
        display_name: "Test User",
        last_seen_at: "2026-04-10T12:00:00Z",
        display_avatar_url: null,
        avatar_url: null,
      },
    ];

    exportUsersToExcel(mockUsers);

    expect(xlsx.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        ID: "1",
        Email: "test@example.com",
        "Display Name": "Test User",
        "Last Seen": new Date("2026-04-10T12:00:00Z").toLocaleString(),
      },
    ]);

    expect(xlsx.utils.book_new).toHaveBeenCalled();
    expect(xlsx.utils.book_append_sheet).toHaveBeenCalled();

    expect(xlsx.writeFile).toHaveBeenCalledWith(undefined, "users-export.xlsx");
  });
});
