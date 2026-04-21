import { describe, it, expect, vi } from "vitest";

import { downloadExcel, exportOrdersToExcel } from "./exportOrdersToExcel";

import type { ReportOrder } from "@/features/reports/domain/types";

const makeOrder = (overrides: Partial<ReportOrder> = {}): ReportOrder => ({
  id: "order-abc-123",
  created_at: "2026-01-15T10:00:00Z",
  payment_status: "approved",
  total: 150.5,
  currency: "USD",
  transfer_number: "TRF-001",
  receipt_url: "https://example.com/receipt.pdf",
  buyer_id: "buyer-1",
  buyer_email: "buyer@example.com",
  buyer_display_name: "Buyer Name",
  seller_id: "seller-1",
  seller_email: "seller@example.com",
  seller_display_name: "Seller Name",
  items: [],
  ...overrides,
});

describe("exportOrdersToExcel", () => {
  it("generates valid XML structure", () => {
    const content = exportOrdersToExcel([makeOrder()]);
    expect(content).toContain('<?xml version="1.0"?>');
    expect(content).toContain("<Workbook");
    expect(content).toContain('<Worksheet ss:Name="Sales Report">');
    expect(content).toContain("</Workbook>");
  });

  it("includes header row with all columns", () => {
    const content = exportOrdersToExcel([]);
    expect(content).toContain('<Data ss:Type="String">Order ID</Data>');
    expect(content).toContain('<Data ss:Type="String">Date</Data>');
    expect(content).toContain('<Data ss:Type="String">Status</Data>');
    expect(content).toContain('<Data ss:Type="String">Buyer Email</Data>');
    expect(content).toContain('<Data ss:Type="String">Transfer #</Data>');
  });

  it("includes order data in output", () => {
    const content = exportOrdersToExcel([makeOrder()]);
    expect(content).toContain('<Data ss:Type="String">order-abc-123</Data>');
    expect(content).toContain(
      '<Data ss:Type="String">buyer@example.com</Data>',
    );
    expect(content).toContain(
      '<Data ss:Type="String">seller@example.com</Data>',
    );
    expect(content).toContain('<Data ss:Type="String">TRF-001</Data>');
    expect(content).toContain('<Data ss:Type="Number">150.5</Data>');
  });

  it("marks receipt as Yes when receipt_url is set", () => {
    const content = exportOrdersToExcel([
      makeOrder({ receipt_url: "https://example.com/r.pdf" }),
    ]);
    expect(content).toContain('<Data ss:Type="String">Yes</Data>');
    expect(content).toContain(
      '<Data ss:Type="String">https://example.com/r.pdf</Data>',
    );
  });

  it("marks receipt as No when receipt_url is null", () => {
    const content = exportOrdersToExcel([makeOrder({ receipt_url: null })]);
    expect(content).toContain('<Data ss:Type="String">No</Data>');
  });

  it("creates one row per item when order has items", () => {
    const order = makeOrder({
      items: [
        {
          id: "item-1",
          product_id: "p1",
          product_name: "Widget A",
          quantity: 2,
          unit_price: 50,
          currency: "USD",
        },
        {
          id: "item-2",
          product_id: "p2",
          product_name: "Widget B",
          quantity: 1,
          unit_price: 50.5,
          currency: "USD",
        },
      ],
    });
    const content = exportOrdersToExcel([order]);
    expect(content).toContain('<Data ss:Type="String">Widget A</Data>');
    expect(content).toContain('<Data ss:Type="String">Widget B</Data>');
    expect(content).toContain('<Data ss:Type="Number">2</Data>');
    expect(content).toContain('<Data ss:Type="Number">50</Data>');
  });

  it("creates a single empty-product row when order has no items", () => {
    const content = exportOrdersToExcel([makeOrder({ items: [] })]);
    // Empty product cell
    expect(content).toContain('<Data ss:Type="Number">0</Data>');
  });

  it("escapes XML special characters", () => {
    const order = makeOrder({ buyer_email: "buyer&test<>\"'@example.com" });
    const content = exportOrdersToExcel([order]);
    expect(content).toContain("buyer&amp;test&lt;&gt;&quot;&apos;@example.com");
  });

  it("returns empty body rows for empty orders array", () => {
    const content = exportOrdersToExcel([]);
    expect(content).toContain(WORKSHEET_OPEN);
    // Only header row, no data rows
    const rowCount = (content.match(/<Row>/g) ?? []).length;
    expect(rowCount).toBe(1);
  });

  it("handles null seller fields gracefully", () => {
    const order = makeOrder({
      seller_email: null,
      seller_display_name: null,
      seller_id: null,
    });
    const content = exportOrdersToExcel([order]);
    // Should not throw — seller email cell should be empty string
    expect(content).toBeDefined();
  });
});

const WORKSHEET_OPEN = '<Worksheet ss:Name="Sales Report"><Table>';

describe("downloadExcel", () => {
  it("creates anchor element and triggers download", () => {
    const mockLink = {
      setAttribute: vi.fn(),
      style: { visibility: "" },
      click: vi.fn(),
      remove: vi.fn(),
    } as unknown as HTMLAnchorElement;

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockReturnValue(mockLink);
    const appendSpy = vi
      .spyOn(document.body, "append")
      .mockImplementation(() => {});
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    globalThis.URL.revokeObjectURL = vi.fn();

    downloadExcel("<Workbook/>", "report.xls");

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(mockLink.setAttribute).toHaveBeenCalledWith("href", "blob:mock");
    expect(mockLink.setAttribute).toHaveBeenCalledWith(
      "download",
      "report.xls",
    );
    expect(appendSpy).toHaveBeenCalledWith(mockLink);
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.remove).toHaveBeenCalled();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    vi.restoreAllMocks();
  });
});
