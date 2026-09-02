import { render, screen, fireEvent } from "@testing-library/react";
import { useQueryStates } from "nuqs";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  Package: () => <svg data-testid="package-icon" />,
}));

const mockSetParams = vi.fn();
vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return {
    ...actual,
    useQueryStates: vi.fn(() => [{ filter: "actionable" }, mockSetParams]),
  };
});

const mockUseAssignedOrders = vi.fn();
vi.mock(
  "@/features/assigned-orders/application/hooks/useAssignedOrders",
  () => ({
    useAssignedOrders: () => mockUseAssignedOrders(),
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
    ReceivedOrderCard: ({ order }: { order: { id: string } }) => (
      <div data-testid={`order-card-${order.id}`} />
    ),
  }),
);

import { AssignedOrdersPageContent } from "@/features/assigned-orders/presentation/pages/AssignedOrdersPageContent";

const makeOrder = (id: string, payment_status: string) => ({
  id,
  user_id: "u1",
  seller_id: "s1",
  payment_status,
  total: 100,
  currency: "USD",
  transfer_number: null,
  receipt_url: null,
  seller_note: null,
  buyer_info: null,
  expires_at: null,
  checkout_session_id: null,
  created_at: "2024-01-01",
  buyer_name: "Buyer",
  items: [],
  seller_name: null,
});

describe("AssignedOrdersPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQueryStates).mockReturnValue([
      { filter: "actionable" },
      mockSetParams,
    ] as ReturnType<typeof useQueryStates>);
  });

  it("shows loading spinner when isLoading is true", () => {
    mockUseAssignedOrders.mockReturnValue({ data: undefined, isLoading: true });
    render(<AssignedOrdersPageContent />);
    expect(screen.getByTestId("assigned-orders-spinner")).toBeInTheDocument();
  });

  it("shows empty state when orders is null after loading", () => {
    mockUseAssignedOrders.mockReturnValue({ data: null, isLoading: false });
    render(<AssignedOrdersPageContent />);
    expect(screen.getByTestId("assigned-orders-empty")).toBeInTheDocument();
    expect(screen.getByText("noOrders")).toBeInTheDocument();
  });

  it("shows empty state when orders is empty array after loading", () => {
    mockUseAssignedOrders.mockReturnValue({ data: [], isLoading: false });
    render(<AssignedOrdersPageContent />);
    expect(screen.getByTestId("assigned-orders-empty")).toBeInTheDocument();
  });

  it("renders all orders when filter is 'all'", () => {
    vi.mocked(useQueryStates).mockReturnValue([
      { filter: "all" },
      mockSetParams,
    ] as ReturnType<typeof useQueryStates>);
    const orders = [
      makeOrder("o1", "pending_verification"),
      makeOrder("o2", "approved"),
      makeOrder("o3", "rejected"),
    ];
    mockUseAssignedOrders.mockReturnValue({ data: orders, isLoading: false });

    render(<AssignedOrdersPageContent />);

    expect(screen.getByTestId("order-card-o1")).toBeInTheDocument();
    expect(screen.getByTestId("order-card-o2")).toBeInTheDocument();
    expect(screen.getByTestId("order-card-o3")).toBeInTheDocument();
  });

  it("shows only actionable orders when filter is 'actionable'", () => {
    vi.mocked(useQueryStates).mockReturnValue([
      { filter: "actionable" },
      mockSetParams,
    ] as ReturnType<typeof useQueryStates>);
    const orders = [
      makeOrder("o1", "pending_verification"),
      makeOrder("o2", "evidence_requested"),
      makeOrder("o3", "approved"),
    ];
    mockUseAssignedOrders.mockReturnValue({ data: orders, isLoading: false });

    render(<AssignedOrdersPageContent />);

    expect(screen.getByTestId("order-card-o1")).toBeInTheDocument();
    expect(screen.getByTestId("order-card-o2")).toBeInTheDocument();
    expect(screen.queryByTestId("order-card-o3")).not.toBeInTheDocument();
  });

  it("shows only orders matching exact status when filter is a specific status", () => {
    vi.mocked(useQueryStates).mockReturnValue([
      { filter: "approved" },
      mockSetParams,
    ] as ReturnType<typeof useQueryStates>);
    const orders = [
      makeOrder("o1", "approved"),
      makeOrder("o2", "rejected"),
      makeOrder("o3", "approved"),
    ];
    mockUseAssignedOrders.mockReturnValue({ data: orders, isLoading: false });

    render(<AssignedOrdersPageContent />);

    expect(screen.getByTestId("order-card-o1")).toBeInTheDocument();
    expect(screen.queryByTestId("order-card-o2")).not.toBeInTheDocument();
    expect(screen.getByTestId("order-card-o3")).toBeInTheDocument();
  });

  it("renders the order list container when orders exist", () => {
    vi.mocked(useQueryStates).mockReturnValue([
      { filter: "all" },
      mockSetParams,
    ] as ReturnType<typeof useQueryStates>);
    mockUseAssignedOrders.mockReturnValue({
      data: [makeOrder("o1", "approved")],
      isLoading: false,
    });

    render(<AssignedOrdersPageContent />);

    expect(screen.getByTestId("assigned-orders-list")).toBeInTheDocument();
  });

  it("calls setParams with the clicked filter status", () => {
    vi.mocked(useQueryStates).mockReturnValue([
      { filter: "all" },
      mockSetParams,
    ] as ReturnType<typeof useQueryStates>);
    mockUseAssignedOrders.mockReturnValue({ data: [], isLoading: false });

    render(<AssignedOrdersPageContent />);

    fireEvent.click(screen.getByTestId("assigned-filter-approved"));

    expect(mockSetParams).toHaveBeenCalledWith(
      { filter: "approved" },
      { history: "push" },
    );
  });

  it("renders filter buttons for all defined statuses", () => {
    mockUseAssignedOrders.mockReturnValue({ data: [], isLoading: false });

    render(<AssignedOrdersPageContent />);

    expect(
      screen.getByTestId("assigned-filter-actionable"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("assigned-filter-all")).toBeInTheDocument();
    expect(
      screen.getByTestId("assigned-filter-pending_verification"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("assigned-filter-evidence_requested"),
    ).toBeInTheDocument();
  });
});
