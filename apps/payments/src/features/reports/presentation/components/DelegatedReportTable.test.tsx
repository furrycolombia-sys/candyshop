import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/features/reports/presentation/components/OrderStatusBadge", () => ({
  OrderStatusBadge: ({ status }: { status: string }) => (
    <span data-testid={`badge-${status}`}>{status}</span>
  ),
}));

import { DelegatedReportTable } from "./DelegatedReportTable";

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

describe("DelegatedReportTable", () => {
  it("shows empty state when no orders", () => {
    render(<DelegatedReportTable orders={[]} />);
    expect(screen.getByText("noResults")).toBeInTheDocument();
    expect(
      screen.queryByTestId("delegated-report-table"),
    ).not.toBeInTheDocument();
  });

  it("renders the table container and one row per delegated item", () => {
    const order = makeOrder({
      items: [
        {
          id: "item-1",
          product_id: "prod-1",
          product_name: "Product A",
          quantity: 2,
          unit_price: 25_000,
          currency: "USD",
        },
        {
          id: "item-2",
          product_id: "prod-2",
          product_name: "Product B",
          quantity: 1,
          unit_price: 10_000,
          currency: "USD",
        },
      ],
    });
    render(<DelegatedReportTable orders={[order]} />);

    expect(screen.getByTestId("delegated-report-table")).toBeInTheDocument();
    const rows = screen.getAllByTestId("delegated-report-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("data-product-id", "prod-1");
    expect(rows[1]).toHaveAttribute("data-product-id", "prod-2");
    expect(screen.getByText("Product A")).toBeInTheDocument();
    expect(screen.getByText("Product B")).toBeInTheDocument();
  });

  it("shows buyer identity and delegated subtotal, not an order total", () => {
    render(<DelegatedReportTable orders={[makeOrder()]} />);
    expect(screen.getByText("buyer@example.com")).toBeInTheDocument();
    expect(screen.getByText("Buyer Name")).toBeInTheDocument();
    // delegated_subtotal 50000 formatted with 2 decimals
    expect(screen.getByText("50,000.00")).toBeInTheDocument();
  });

  it("never renders receipt or transfer content", () => {
    render(<DelegatedReportTable orders={[makeOrder()]} />);
    const table = screen.getByTestId("delegated-report-table");
    expect(table.textContent).not.toMatch(/receipt/i);
    expect(table.textContent).not.toMatch(/transfer/i);
    // no receipt/transfer per-row test-ids from the seller table
    expect(
      screen.queryByTestId("seller-report-row-receipt-order-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("seller-report-row-transfer-order-1"),
    ).not.toBeInTheDocument();
  });
});
