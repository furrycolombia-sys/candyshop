import { describe, it, expect, vi } from "vitest";

import { downloadExcel, exportUsersToExcel } from "./export-csv";

import type { UserProfileSummary } from "@/features/users/domain/types";

describe("export-excel", () => {
  describe("exportUsersToExcel", () => {
    it("should format users and export them to excel xml", () => {
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

      const content = exportUsersToExcel(
        mockUsers,
        {
          "1": ["receipts.read"],
        },
        [
          {
            userId: "1",
            orderId: "order-1",
            storagePath: "order-1/receipt.png",
            fileName: "receipt.png",
            mimeType: "image/png",
            byteSize: 12,
            fileBase64: "dGVzdA==",
          },
        ],
      );

      expect(content).toContain('<?xml version="1.0"?>');
      expect(content).toContain('<Data ss:Type="String">ID</Data>');
      expect(content).toContain(
        '<Data ss:Type="String">test@example.com</Data>',
      );
      expect(content).toContain(
        '<Data ss:Type="String">Test &quot;User&quot;</Data>',
      );
      expect(content).toContain('<Data ss:Type="String">Yes</Data>');
      expect(content).toContain('<Data ss:Type="String">No</Data>');
      expect(content).toContain('<Worksheet ss:Name="Receipts"><Table>');
      expect(content).toContain(
        '<Data ss:Type="String">order-1/receipt.png</Data>',
      );
      expect(content).toContain('<Data ss:Type="String">dGVzdA==</Data>');
    });
  });

  describe("downloadExcel", () => {
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

      downloadExcel("<Workbook/>", "test.xls");

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        "href",
        "blob:mock-url",
      );
      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        "download",
        "test.xls",
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
