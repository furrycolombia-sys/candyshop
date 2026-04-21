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

import { SellerReportTable } from "./SellerReportTable";

import type { SellerReportOrder } from "@/features/reports/domain/types";

function makeOrder(id: string): SellerReportOrder {
  return {
    id,
    created_at: "2024-01-15T10:00:00Z",
    payment_status: "approved",
    buyer_email: "buyer@example.com",
    buyer_display_name: "Buyer Name",
    buyer_id: "user-1",
    total: 99.99,
    currency: "USD",
    transfer_number: "TXN123",
    receipt_url: "https://example.com/receipt.jpg",
    items: [
      {
        id: "item-1",
        product_id: "prod-1",
        product_name: "Product A",
        quantity: 2,
        unit_price: 25,
        currency: "USD",
      },
    ],
  };
}

describe("SellerReportTable", () => {
  it("shows empty state when no orders", () => {
    render(<SellerReportTable orders={[]} />);
    expect(screen.getByText("noResults")).toBeInTheDocument();
  });

  it("renders table with orders", () => {
    render(<SellerReportTable orders={[makeOrder("abc-123")]} />);
    expect(screen.getByTestId("seller-report-table")).toBeInTheDocument();
    expect(screen.getByText("buyer@example.com")).toBeInTheDocument();
    expect(screen.getByText("Buyer Name")).toBeInTheDocument();
  });

  it("shows transfer number", () => {
    render(<SellerReportTable orders={[makeOrder("order-1")]} />);
    expect(screen.getByText("TXN123")).toBeInTheDocument();
  });

  it("shows receipt link when present", () => {
    render(<SellerReportTable orders={[makeOrder("order-1")]} />);
    expect(screen.getByText("table.hasReceipt")).toBeInTheDocument();
  });

  it("shows no receipt text when receipt_url is null", () => {
    const order = { ...makeOrder("order-1"), receipt_url: null };
    render(<SellerReportTable orders={[order]} />);
    expect(screen.getByText("table.noReceipt")).toBeInTheDocument();
  });

  it("shows product items", () => {
    render(<SellerReportTable orders={[makeOrder("order-1")]} />);
    expect(screen.getByText("Product A")).toBeInTheDocument();
  });

  it("renders multiple orders", () => {
    render(
      <SellerReportTable
        orders={[makeOrder("order-1"), makeOrder("order-2")]}
      />,
    );
    expect(screen.getAllByText("buyer@example.com")).toHaveLength(2);
  });
});
