import { describe, it, expect } from "vitest";

import {
  exportDelegatedOrdersToExcel,
  buildDelegatedExportFilename,
} from "@/features/reports/application/utils/exportDelegatedOrdersToExcel";

import type { DelegatedReportOrder } from "@/features/reports/domain/types";

function makeOrder(
  overrides: Partial<DelegatedReportOrder> = {},
): DelegatedReportOrder {
  return {
    id: "order-1",
    created_at: "2024-01-15T10:00:00Z",
    payment_status: "approved",
    delegated_subtotal: 50_000,
    currency: "USD",
    buyer_id: "user-1",
    buyer_email: "buyer@example.com",
    buyer_display_name: "Buyer Name",
    items: [
      {
        id: "item-1",
        product_id: "prod-1",
        product_name: "Product A",
        quantity: 2,
        unit_price: 25_000,
        currency: "USD",
      },
    ],
    ...overrides,
  };
}

describe("exportDelegatedOrdersToExcel", () => {
  it("returns valid XML Workbook structure", () => {
    const xml = exportDelegatedOrdersToExcel([makeOrder()]);
    expect(xml).toContain('<?xml version="1.0"?>');
    expect(xml).toContain("Workbook");
    expect(xml).toContain("Delegated Report");
  });

  it("includes the ten delegated columns and excludes transfer/receipt columns", () => {
    const xml = exportDelegatedOrdersToExcel([makeOrder()]);
    for (const header of [
      "Order ID",
      "Date",
      "Status",
      "Buyer Email",
      "Buyer Name",
      "Product",
      "Qty",
      "Unit Price",
      "Currency",
      "Delegated Subtotal",
    ]) {
      expect(xml).toContain(header);
    }
    expect(xml).not.toMatch(/Transfer/i);
    expect(xml).not.toMatch(/Receipt/i);
  });

  it("reflects the delegated subtotal in a row", () => {
    const xml = exportDelegatedOrdersToExcel([
      makeOrder({ delegated_subtotal: 50_000 }),
    ]);
    expect(xml).toContain('<Cell><Data ss:Type="Number">50000</Data></Cell>');
  });

  it("includes one row per item and the product name", () => {
    const xml = exportDelegatedOrdersToExcel([
      makeOrder({
        items: [
          {
            id: "i1",
            product_id: "p1",
            product_name: "Product A",
            quantity: 1,
            unit_price: 10,
            currency: "USD",
          },
          {
            id: "i2",
            product_id: "p2",
            product_name: "Product B",
            quantity: 3,
            unit_price: 20,
            currency: "USD",
          },
        ],
      }),
    ]);
    expect(xml).toContain("Product A");
    expect(xml).toContain("Product B");
  });

  it("handles an order with no items without crashing", () => {
    const xml = exportDelegatedOrdersToExcel([makeOrder({ items: [] })]);
    expect(xml).toContain("order-1");
  });

  it("escapes XML special characters in buyer email", () => {
    const xml = exportDelegatedOrdersToExcel([
      makeOrder({ buyer_email: 'a&b"c<d>e' }),
    ]);
    expect(xml).toContain("a&amp;b");
    expect(xml).toContain("&lt;d&gt;");
  });
});

describe("buildDelegatedExportFilename", () => {
  it("matches the delegated-report filename pattern", () => {
    expect(buildDelegatedExportFilename()).toMatch(
      /^delegated-report-.*\.xls$/,
    );
  });
});
