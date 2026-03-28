import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ReceivedOrdersPage } from "./ReceivedOrdersPage";

import type { ReceivedOrder } from "@/features/received-orders/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  },
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

const mockSetParams = vi.fn();
vi.mock("nuqs", () => ({
  useQueryStates: () => [{ filter: "all" }, mockSetParams],
  parseAsStringEnum: () => ({
    withDefault: () => "all",
  }),
}));

const mockUseReceivedOrders = vi.fn();
vi.mock(
  "@/features/received-orders/application/hooks/useReceivedOrders",
  () => ({
    useReceivedOrders: (filter?: string) => mockUseReceivedOrders(filter),
  }),
);

const mockExecuteAction = vi.fn();
vi.mock("@/features/received-orders/application/hooks/useOrderActions", () => ({
  useOrderActions: () => ({
    mutate: mockExecuteAction,
    isPending: false,
  }),
}));

vi.mock(
  "@/features/received-orders/presentation/components/ReceivedOrderCard",
  () => ({
    ReceivedOrderCard: ({ order }: { order: ReceivedOrder }) => (
      <div data-testid={`received-order-${order.id}`}>{order.buyer_name}</div>
    ),
  }),
);

function makeOrder(overrides: Partial<ReceivedOrder> = {}): ReceivedOrder {
  return {
    id: "order-1",
    user_id: "buyer-1",
    seller_id: "seller-1",
    payment_status: "pending_verification",
    total_cop: 10_000,
    transfer_number: "TX-1",
    receipt_url: null,
    seller_note: null,
    expires_at: null,
    checkout_session_id: null,
    created_at: "2026-01-01T00:00:00Z",
    buyer_name: "Buyer Bob",
    items: [],
    ...overrides,
  };
}

describe("ReceivedOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading spinner when loading", () => {
    mockUseReceivedOrders.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<ReceivedOrdersPage />);
    expect(screen.getByTestId("received-orders-page")).toBeInTheDocument();
  });

  it("renders empty state when no orders", () => {
    mockUseReceivedOrders.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<ReceivedOrdersPage />);
    expect(screen.getByTestId("received-orders-empty")).toBeInTheDocument();
    expect(screen.getByText("noOrders")).toBeInTheDocument();
  });

  it("renders order cards when orders exist", () => {
    const orders = [
      makeOrder({ id: "o1" }),
      makeOrder({ id: "o2", buyer_name: "Buyer Alice" }),
    ];

    mockUseReceivedOrders.mockReturnValue({
      data: orders,
      isLoading: false,
    });

    render(<ReceivedOrdersPage />);
    expect(screen.getByTestId("received-orders-list")).toBeInTheDocument();
    expect(screen.getByTestId("received-order-o1")).toBeInTheDocument();
    expect(screen.getByTestId("received-order-o2")).toBeInTheDocument();
  });

  it("renders filter pills", () => {
    mockUseReceivedOrders.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<ReceivedOrdersPage />);
    expect(screen.getByTestId("received-orders-filters")).toBeInTheDocument();
    expect(screen.getByTestId("filter-all")).toBeInTheDocument();
    expect(screen.getByTestId("filter-approved")).toBeInTheDocument();
  });

  it("calls setParams when a filter pill is clicked", () => {
    mockUseReceivedOrders.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<ReceivedOrdersPage />);
    fireEvent.click(screen.getByTestId("filter-approved"));

    expect(mockSetParams).toHaveBeenCalledWith(
      { filter: "approved" },
      { history: "push" },
    );
  });

  it("renders the page title", () => {
    mockUseReceivedOrders.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<ReceivedOrdersPage />);
    expect(screen.getByTestId("received-orders-title")).toBeInTheDocument();
  });
});
