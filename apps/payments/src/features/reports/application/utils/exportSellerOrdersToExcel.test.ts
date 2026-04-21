import { describe, it, expect } from "vitest";

import {
  exportSellerOrdersToExcel,
  buildExportFilename,
} from "./exportSellerOrdersToExcel";

import type {
  SellerReportOrder,
  SellerReportFilters,
} from "@/features/reports/domain/types";

const emptyFilters: SellerReportFilters = {
  dateFrom: null,
  dateTo: null,
  status: null,
  buyerId: null,
  currency: null,
  amountMin: null,
  amountMax: null,
};

function makeOrder(
  overrides: Partial<SellerReportOrder> = {},
): SellerReportOrder {
  return {
    id: "order-1",
    created_at: "2024-01-15T10:00:00Z",
    payment_status: "approved",
    buyer_email: "buyer@example.com",
    buyer_display_name: "Buyer Name",
    buyer_id: "user-1",
    total: 100,
    currency: "USD",
    transfer_number: "TXN123",
    receipt_url: "https://example.com/receipt.jpg",
    items: [],
    ...overrides,
  };
}

describe("exportSellerOrdersToExcel", () => {
  it("returns valid XML Workbook structure", () => {
    const xml = exportSellerOrdersToExcel([makeOrder()], emptyFilters);
    expect(xml).toContain('<?xml version="1.0"?>');
    expect(xml).toContain("Workbook");
    expect(xml).toContain("My Sales Report");
  });

  it("includes order data in the output", () => {
    const order = makeOrder({ id: "abc-123", buyer_email: "test@example.com" });
    const xml = exportSellerOrdersToExcel([order], emptyFilters);
    expect(xml).toContain("abc-123");
    expect(xml).toContain("test@example.com");
  });

  it("handles empty created_at without crashing", () => {
    const order = makeOrder({ created_at: "" });
    expect(() =>
      exportSellerOrdersToExcel([order], emptyFilters),
    ).not.toThrow();
    const xml = exportSellerOrdersToExcel([order], emptyFilters);
    expect(xml).toContain("order-1");
  });

  it("handles order with no items", () => {
    const order = makeOrder({ items: [] });
    const xml = exportSellerOrdersToExcel([order], emptyFilters);
    expect(xml).toContain("order-1");
  });

  it("includes one row per item when order has items", () => {
    const order = makeOrder({
      items: [
        {
          id: "item-1",
          product_id: "prod-1",
          product_name: "Product A",
          quantity: 2,
          unit_price: 25,
          currency: "USD",
        },
        {
          id: "item-2",
          product_id: "prod-2",
          product_name: "Product B",
          quantity: 1,
          unit_price: 50,
          currency: "USD",
        },
      ],
    });
    const xml = exportSellerOrdersToExcel([order], emptyFilters);
    expect(xml).toContain("Product A");
    expect(xml).toContain("Product B");
  });

  it("includes Filters sheet", () => {
    const xml = exportSellerOrdersToExcel([], emptyFilters);
    expect(xml).toContain('ss:Name="Filters"');
  });

  it("escapes XML special characters in buyer email", () => {
    const order = makeOrder({ buyer_email: 'a&b"c<d>e' });
    const xml = exportSellerOrdersToExcel([order], emptyFilters);
    expect(xml).toContain("a&amp;b");
    expect(xml).toContain("&lt;d&gt;");
  });
});

describe("buildExportFilename", () => {
  it("returns a string starting with my-sales-report", () => {
    expect(buildExportFilename()).toMatch(/^my-sales-report-/);
  });

  it("returns a .xls file", () => {
    expect(buildExportFilename()).toMatch(/\.xls$/);
  });
});
