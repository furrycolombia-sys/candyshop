import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { OrderCard } from "./OrderCard";

import type { OrderWithItems } from "@/features/orders/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/shared/application/utils/formatPrice", () => ({
  formatPrice: (amount: number, currency: string) =>
    `$${amount.toLocaleString()} ${currency}`,
}));

const mockMutate = vi.fn();
vi.mock("@/features/orders/application/hooks/useResubmitEvidence", () => ({
  useResubmitEvidence: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock("@/features/orders/presentation/components/OrderStatusBadge", () => ({
  OrderStatusBadge: ({ status }: { status: string }) => (
    <span data-testid={`order-status-${status}`}>{status}</span>
  ),
}));

vi.mock("@/features/orders/presentation/components/OrderItemsList", () => ({
  OrderItemsList: () => <div data-testid="order-items-list">Items</div>,
}));

vi.mock("@/features/orders/presentation/components/StatusContent", () => ({
  StatusContent: () => <div data-testid="status-content">Status</div>,
}));

vi.mock("@/features/orders/presentation/components/ExpirationLabel", () => ({
  ExpirationLabel: ({ expiresAt }: { expiresAt: string }) => (
    <span>Expires: {expiresAt}</span>
  ),
}));

function makeOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
  return {
    id: "order-1",
    user_id: "user-1",
    seller_id: "s1",
    payment_status: "pending_verification",
    total: 15_000,
    currency: "COP",
    transfer_number: null,
    receipt_url: null,
    seller_note: null,
    expires_at: null,
    checkout_session_id: null,
    created_at: "2026-01-01T00:00:00Z",
    payment_method_id: null,
    items: [],
    seller_name: "Test Seller",
    ...overrides,
  };
}

describe("OrderCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders seller name and total", () => {
    render(<OrderCard order={makeOrder()} />);
    expect(screen.getByText("Test Seller")).toBeInTheDocument();
    expect(screen.getByText("$15,000 COP")).toBeInTheDocument(); // formatPrice mock: `$${amount} ${currency}`
  });

  it("shows status badge", () => {
    render(<OrderCard order={makeOrder()} />);
    expect(
      screen.getByTestId("order-status-pending_verification"),
    ).toBeInTheDocument();
  });

  it("starts collapsed for non-evidence_requested status", () => {
    render(<OrderCard order={makeOrder({ payment_status: "approved" })} />);
    // Status content should not be visible when collapsed
    expect(screen.queryByTestId("status-content")).not.toBeInTheDocument();
  });

  it("starts expanded for evidence_requested status", () => {
    render(
      <OrderCard order={makeOrder({ payment_status: "evidence_requested" })} />,
    );
    expect(screen.getByTestId("status-content")).toBeInTheDocument();
  });

  it("toggles expand/collapse on click", () => {
    render(<OrderCard order={makeOrder({ payment_status: "approved" })} />);

    // Initially collapsed
    expect(screen.queryByTestId("status-content")).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByTestId("order-card-toggle-order-1"));
    expect(screen.getByTestId("status-content")).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(screen.getByTestId("order-card-toggle-order-1"));
    expect(screen.queryByTestId("status-content")).not.toBeInTheDocument();
  });

  it("shows expiration label for non-terminal orders with expires_at", () => {
    render(
      <OrderCard
        order={makeOrder({
          payment_status: "pending_verification",
          expires_at: "2026-06-01T00:00:00Z",
        })}
      />,
    );

    // Need to expand first - evidence_requested auto-expands, but pending_verification doesn't
    // Actually pending_verification starts collapsed. Let's expand.
    fireEvent.click(screen.getByTestId("order-card-toggle-order-1"));
    expect(screen.getByText(/Expires:/)).toBeInTheDocument();
  });

  it("does not show expiration label for terminal status", () => {
    render(
      <OrderCard
        order={makeOrder({
          payment_status: "approved",
          expires_at: "2026-06-01T00:00:00Z",
        })}
      />,
    );

    // Expand
    fireEvent.click(screen.getByTestId("order-card-toggle-order-1"));
    expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument();
  });

  it("has aria-expanded attribute on toggle button", () => {
    render(<OrderCard order={makeOrder({ payment_status: "approved" })} />);

    const toggle = screen.getByTestId("order-card-toggle-order-1");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
