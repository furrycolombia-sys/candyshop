import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (values) return `${key}:${JSON.stringify(values)}`;
    return key;
  },
}));

vi.mock("@/shared/infrastructure/config/tid", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/features/reports/presentation/components/OrderStatusBadge", () => ({
  OrderStatusBadge: ({ status }: { status: string }) => (
    <span data-testid={`status-badge-${status}`}>{status}</span>
  ),
}));

import { ReportTable } from "./ReportTable";

import type { ReportOrder } from "@/features/reports/domain/types";

const makeOrder = (overrides: Partial<ReportOrder> = {}): ReportOrder => ({
  id: "order-uuid-1234",
  created_at: "2026-01-15T10:00:00Z",
  payment_status: "approved",
  total: 100,
  currency: "USD",
  transfer_number: "TRF-001",
  receipt_url: "https://example.com/r.pdf",
  buyer_id: "buyer-1",
  buyer_email: "buyer@example.com",
  buyer_display_name: "Buyer Name",
  seller_id: "seller-1",
  seller_email: "seller@example.com",
  seller_display_name: "Seller Name",
  items: [],
  ...overrides,
});

describe("ReportTable", () => {
  it("shows empty state when orders array is empty", () => {
    render(<ReportTable orders={[]} />);
    expect(screen.getByText("noResults")).toBeInTheDocument();
    expect(screen.queryByTestId("report-table")).not.toBeInTheDocument();
  });

  it("renders table when orders are present", () => {
    render(<ReportTable orders={[makeOrder()]} />);
    expect(screen.getByTestId("report-table")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<ReportTable orders={[makeOrder()]} />);
    expect(screen.getByText("table.orderId")).toBeInTheDocument();
    expect(screen.getByText("table.date")).toBeInTheDocument();
    expect(screen.getByText("table.status")).toBeInTheDocument();
    expect(screen.getByText("table.buyer")).toBeInTheDocument();
    expect(screen.getByText("table.seller")).toBeInTheDocument();
    expect(screen.getByText("table.amount")).toBeInTheDocument();
    expect(screen.getByText("table.currency")).toBeInTheDocument();
  });

  it("renders the first 8 characters of order ID", () => {
    render(
      <ReportTable orders={[makeOrder({ id: "order-uuid-1234-5678" })]} />,
    );
    expect(screen.getByText("order-uu…")).toBeInTheDocument();
  });

  it("renders buyer email", () => {
    render(<ReportTable orders={[makeOrder()]} />);
    expect(screen.getByText("buyer@example.com")).toBeInTheDocument();
  });

  it("renders seller email", () => {
    render(<ReportTable orders={[makeOrder()]} />);
    expect(screen.getByText("seller@example.com")).toBeInTheDocument();
  });

  it("renders dash for missing seller", () => {
    render(<ReportTable orders={[makeOrder({ seller_email: null })]} />);
    // The em dash '—' should appear for seller cell
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders item product names", () => {
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
          unit_price: 50,
          currency: "USD",
        },
      ],
    });
    render(<ReportTable orders={[order]} />);
    expect(screen.getByText("Widget A")).toBeInTheDocument();
    expect(screen.getByText("Widget B")).toBeInTheDocument();
  });

  it("renders currency in uppercase", () => {
    render(<ReportTable orders={[makeOrder({ currency: "usd" })]} />);
    expect(screen.getByText("usd")).toBeInTheDocument();
  });

  it("renders transfer number", () => {
    render(
      <ReportTable orders={[makeOrder({ transfer_number: "TRF-999" })]} />,
    );
    expect(screen.getByText("TRF-999")).toBeInTheDocument();
  });

  it("renders receipt link when receipt_url is present", () => {
    render(
      <ReportTable
        orders={[makeOrder({ receipt_url: "https://example.com/r.pdf" })]}
      />,
    );
    const link = screen.getByRole("link", { name: "table.hasReceipt" });
    expect(link).toHaveAttribute("href", "https://example.com/r.pdf");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows no-receipt text when receipt_url is null", () => {
    render(<ReportTable orders={[makeOrder({ receipt_url: null })]} />);
    expect(screen.getByText("table.noReceipt")).toBeInTheDocument();
  });

  it("renders OrderStatusBadge with correct status", () => {
    render(
      <ReportTable orders={[makeOrder({ payment_status: "rejected" })]} />,
    );
    expect(screen.getByTestId("status-badge-rejected")).toBeInTheDocument();
  });

  it("renders multiple orders as multiple rows", () => {
    const orders = [
      makeOrder({ id: "order-1111-1234" }),
      makeOrder({ id: "order-2222-1234" }),
    ];
    render(<ReportTable orders={orders} />);
    expect(screen.getByText("order-11…")).toBeInTheDocument();
    expect(screen.getByText("order-22…")).toBeInTheDocument();
  });
});
