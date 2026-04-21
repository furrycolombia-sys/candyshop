import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import type { ReceivedOrder } from "@/features/received-orders/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shared")>();
  return {
    ...actual,
    tid: (id: string) => ({ "data-testid": id }),
  };
});

vi.mock("@/shared/application/utils/formatPrice", () => ({
  formatPrice: (amount: number, currency: string) =>
    `$${amount.toLocaleString()} ${currency}`,
}));

vi.mock("./ReceivedStatusBadge", () => ({
  ReceivedStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="order-status-badge">{status}</span>
  ),
}));

vi.mock("./ReceiptViewer", () => ({
  ReceiptViewer: () => <div data-testid="receipt-viewer">Receipt</div>,
}));

vi.mock("./ActionButtons", () => ({
  ActionButtons: ({ orderId }: { orderId: string }) => (
    <div data-testid={`order-actions-${orderId}`}>Actions</div>
  ),
}));

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { ReceivedOrderCard } from "./ReceivedOrderCard";

function makeOrder(overrides: Partial<ReceivedOrder> = {}): ReceivedOrder {
  return {
    id: "order-1",
    user_id: "buyer-1",
    seller_id: "seller-1",
    payment_status: "pending_verification",
    total: 15_000,
    currency: "COP",
    transfer_number: "TX-1",
    receipt_url: null,
    seller_note: null,
    buyer_info: null,
    expires_at: null,
    checkout_session_id: null,
    created_at: "2026-01-01T00:00:00Z",
    buyer_name: "Buyer Bob",
    items: [
      {
        id: "oi1",
        product_id: "p1",
        quantity: 1,
        unit_price: 15_000,
        currency: "COP",
        metadata: { name_en: "Widget" },
      },
    ],
    seller_name: null,
    ...overrides,
  };
}

describe("ReceivedOrderCard", () => {
  const mockOnAction = vi.fn();

  it("renders buyer name and total", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder()}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    expect(screen.getByText(/Buyer Bob/)).toBeInTheDocument();
    // Total appears in header and also per-item; just check it exists
    expect(screen.getAllByText("$15,000 COP").length).toBeGreaterThanOrEqual(1);
  });

  it("renders status badge", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder()}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    expect(screen.getByTestId("order-status-badge")).toBeInTheDocument();
  });

  it("renders items list", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder()}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    expect(screen.getByText(/Widget/)).toBeInTheDocument();
  });

  it("renders receipt viewer", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder()}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    expect(screen.getByTestId("receipt-viewer")).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder()}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    expect(screen.getByTestId("order-actions-order-1")).toBeInTheDocument();
  });

  it("shows seller note when present", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder({ seller_note: "Please check the receipt" })}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    expect(screen.getByText(/Please check the receipt/)).toBeInTheDocument();
  });

  it("does not show seller note when absent", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder({ seller_note: null })}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    // No note displayed as standalone text
    expect(screen.queryByText(/Please check/)).not.toBeInTheDocument();
  });

  it("has the correct test ID", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder()}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    expect(screen.getByTestId("received-order-order-1")).toBeInTheDocument();
  });
});
