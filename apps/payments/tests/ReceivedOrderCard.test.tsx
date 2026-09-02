import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock(
  "@/features/received-orders/presentation/components/ReceivedStatusBadge",
  () => ({
    ReceivedStatusBadge: ({ status }: { status: string }) => (
      <span data-testid="order-status-badge">{status}</span>
    ),
  }),
);

vi.mock(
  "@/features/received-orders/presentation/components/ReceiptViewer",
  () => ({
    ReceiptViewer: () => <div data-testid="receipt-viewer">Receipt</div>,
  }),
);

vi.mock(
  "@/features/received-orders/presentation/components/ActionButtons",
  () => ({
    ActionButtons: ({
      orderId,
      onAction,
    }: {
      orderId: string;
      onAction: (action: string, note?: string) => void;
    }) => (
      <div data-testid={`order-actions-${orderId}`}>
        <button
          type="button"
          data-testid={`trigger-action-${orderId}`}
          onClick={() => onAction("approved")}
        >
          Approve
        </button>
      </div>
    ),
  }),
);

vi.mock("lucide-react", () => ({
  Clock: () => <svg data-testid="clock-icon" />,
}));

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { ReceivedOrderCard } from "@/features/received-orders/presentation/components/ReceivedOrderCard";

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

  beforeEach(() => {
    mockOnAction.mockClear();
  });

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

  it("renders buyer_info with plain text value as a span", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder({ buyer_info: { Nequi: "3001234567" } })}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    expect(screen.getByText("3001234567")).toBeInTheDocument();
    expect(screen.getByText("Nequi")).toBeInTheDocument();
  });

  it("renders buyer_info with a non-image https URL as a link", () => {
    const url = "https://example.com/document";
    render(
      <ReceivedOrderCard
        order={makeOrder({ buyer_info: { Document: url } })}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    const link = screen.getByRole("link", { name: url });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", url);
  });

  it("renders buyer_info with an image URL as an img element", () => {
    const imgUrl = "https://example.com/receipt.jpg";
    render(
      <ReceivedOrderCard
        order={makeOrder({ buyer_info: { Receipt: imgUrl } })}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", imgUrl);
  });

  it("does not render buyer_info section when buyer_info is null", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder({ buyer_info: null })}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    // No extra keys in the document from buyer_info
    expect(screen.queryByText("Nequi")).not.toBeInTheDocument();
  });

  it("renders seller_name badge when seller_name is present", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder({ seller_name: "Acme Store" })}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    // t("onBehalfOf", ...) returns "onBehalfOf" with the translation mock
    expect(screen.getByText("onBehalfOf")).toBeInTheDocument();
  });

  it("does not render seller_name badge when seller_name is null", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder({ seller_name: null })}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    expect(screen.queryByText("onBehalfOf")).not.toBeInTheDocument();
  });

  it("shows expiring soon warning for a past expires_at date with pending_verification status", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder({
          expires_at: "2020-01-01T00:00:00Z",
          payment_status: "pending_verification",
        })}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    // Clock icon appears only when isExpiringSoon=true and payment_status=pending_verification
    expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
  });

  it("does not show expiring soon warning when expires_at is null", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder({ expires_at: null })}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    expect(screen.queryByTestId("clock-icon")).not.toBeInTheDocument();
  });

  it("does not show expiring soon warning when status is not pending_verification", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder({
          expires_at: "2020-01-01T00:00:00Z",
          payment_status: "approved",
        })}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    expect(screen.queryByTestId("clock-icon")).not.toBeInTheDocument();
  });

  it("calls onAction with orderId and action when an action is triggered", () => {
    render(
      <ReceivedOrderCard
        order={makeOrder()}
        onAction={mockOnAction}
        isPending={false}
      />,
    );
    fireEvent.click(screen.getByTestId("trigger-action-order-1"));
    expect(mockOnAction).toHaveBeenCalledWith("order-1", "approved", undefined);
  });
});
