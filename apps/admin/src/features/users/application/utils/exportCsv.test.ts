import { describe, it, expect, vi } from "vitest";

import { exportUsersToCsv, downloadCsv } from "./exportCsv";

import type { UserProfileSummary } from "@/features/users/domain/types";

describe("export-csv", () => {
  describe("exportUsersToCsv", () => {
    it("should format users and export them to a csv string", () => {
      const mockUsers: UserProfileSummary[] = [
        {
          id: "1",
          email: "test@example.com",
          display_name: 'Test "User"',
          last_seen_at: "2026-04-10T12:00:00Z",
          display_avatar_url: null,
          avatar_url: null,
        },
      ];

      const csv = exportUsersToCsv(mockUsers);

      expect(csv).toContain("ID,Email,Display Name,Last Seen");
      expect(csv).toContain(`1,test@example.com,"Test ""User"""`);
    });

    it("should return empty string for empty array", () => {
      expect(exportUsersToCsv([])).toBe("");
    });
  });

  describe("downloadCsv", () => {
    it("should create a link and trigger download", () => {
      const mockLink = {
        setAttribute: vi.fn(),
        style: { visibility: "" },
        click: vi.fn(),
        remove: vi.fn(),
      } as unknown as HTMLAnchorElement;

      const createElementSpy = vi
        .spyOn(document, "createElement")
        .mockReturnValue(mockLink);
      const appendChildSpy = vi
        .spyOn(document.body, "append")
        .mockImplementation(() => {});

      globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
      globalThis.URL.revokeObjectURL = vi.fn();

      downloadCsv("test,csv", "test.csv");

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        "href",
        "blob:mock-url",
      );
      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        "download",
        "test.csv",
      );
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.remove).toHaveBeenCalled();
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith(
        "blob:mock-url",
      );

      vi.restoreAllMocks();
    });
  });
});
