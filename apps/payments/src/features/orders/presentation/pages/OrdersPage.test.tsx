import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({
    isLoading: false,
    hasPermission: (permission: string | string[]) =>
      Array.isArray(permission)
        ? permission.every((key) => key === "orders.read")
        : permission === "orders.read",
  }),
}));

import { OrdersPage } from "./OrdersPage";

import type { OrderWithItems } from "@/features/orders/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  },
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

vi.mock("@/shared/infrastructure/config", async () => {
  const { mockPaymentsConfig } = await import("@/test/fixtures/appUrls");
  return mockPaymentsConfig;
});

const mockUseMyOrders = vi.fn();
vi.mock("@/features/orders/application/hooks/useMyOrders", () => ({
  useMyOrders: () => mockUseMyOrders(),
}));

vi.mock("@/features/orders/presentation/components/OrderCard", () => ({
  OrderCard: ({ order }: { order: OrderWithItems }) => (
    <div data-testid={`order-card-${order.id}`}>{order.seller_name}</div>
  ),
}));

function makeOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
  return {
    id: "order-1",
    user_id: "user-1",
    seller_id: "s1",
    payment_status: "approved",
    total: 10_000,
    currency: "COP",
    transfer_number: null,
    receipt_url: null,
    seller_note: null,
    expires_at: null,
    checkout_session_id: "session-1",
    created_at: "2026-01-01T00:00:00Z",
    payment_method_id: "pm-1",
    items: [],
    seller_name: "Test Seller",
    ...overrides,
  };
}

describe("OrdersPage", () => {
  it("renders skeletons when loading", () => {
    mockUseMyOrders.mockReturnValue({ data: undefined, isLoading: true });
    render(<OrdersPage />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders empty state when no orders", () => {
    mockUseMyOrders.mockReturnValue({ data: [], isLoading: false });
    render(<OrdersPage />);
    expect(screen.getByTestId("orders-empty")).toBeInTheDocument();
    expect(screen.getByText("noOrders")).toBeInTheDocument();
  });

  it("renders empty state when data is null", () => {
    mockUseMyOrders.mockReturnValue({ data: null, isLoading: false });
    render(<OrdersPage />);
    expect(screen.getByTestId("orders-empty")).toBeInTheDocument();
  });

  it("renders orders grouped by checkout session", () => {
    const orders = [
      makeOrder({ id: "o1", checkout_session_id: "sess-1" }),
      makeOrder({ id: "o2", checkout_session_id: "sess-1" }),
      makeOrder({
        id: "o3",
        checkout_session_id: "sess-2",
        created_at: "2026-01-02T00:00:00Z",
      }),
    ];

    mockUseMyOrders.mockReturnValue({ data: orders, isLoading: false });
    render(<OrdersPage />);

    expect(screen.getByTestId("orders-page")).toBeInTheDocument();
    expect(screen.getByTestId("order-card-o1")).toBeInTheDocument();
    expect(screen.getByTestId("order-card-o2")).toBeInTheDocument();
    expect(screen.getByTestId("order-card-o3")).toBeInTheDocument();
  });

  it("renders back to store link", () => {
    const orders = [makeOrder()];
    mockUseMyOrders.mockReturnValue({ data: orders, isLoading: false });
    render(<OrdersPage />);

    expect(screen.getByTestId("orders-back-to-store")).toBeInTheDocument();
  });
});
