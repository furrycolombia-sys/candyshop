import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

const mockMutate = vi.fn();
const mockUseDelegatedOrders = vi.fn(() => ({
  data: [],
  isLoading: false,
}));
const mockUseDelegateOrderActions = vi.fn(() => ({
  mutate: mockMutate,
  isPending: false,
}));
const mockUseDelegationContext = vi.fn(() => ({
  delegations: [],
  isLoading: false,
  isDelegateFor: () => false,
  canApprove: () => false,
  canRequestProof: () => false,
}));

vi.mock(
  "@/features/seller-admins/application/hooks/useDelegatedOrders",
  () => ({
    useDelegatedOrders: () => mockUseDelegatedOrders(),
  }),
);

vi.mock(
  "@/features/seller-admins/application/hooks/useDelegateOrderActions",
  () => ({
    useDelegateOrderActions: () => mockUseDelegateOrderActions(),
  }),
);

vi.mock(
  "@/features/seller-admins/application/hooks/useDelegationContext",
  () => ({
    useDelegationContext: () => mockUseDelegationContext(),
  }),
);

// Use real components so we can test renderActions callbacks
vi.mock(
  "@/features/seller-admins/presentation/components/DelegatedOrderList",
  () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DelegatedOrderList: ({ groups, renderActions }: any) => (
      <div data-testid="delegated-orders-list">
        {groups.map(
          (g: {
            seller: { seller_id: string };
            orders: Array<{ id: string; payment_status: string }>;
          }) =>
            g.orders.map((o: { id: string; payment_status: string }) => (
              <div key={o.id} data-testid={`order-${o.id}`}>
                {renderActions?.(o, g.seller)}
              </div>
            )),
        )}
      </div>
    ),
  }),
);

vi.mock(
  "@/features/seller-admins/presentation/components/DelegateOrderActions",
  () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DelegateOrderActions: ({ orderId, onApprove, onRequestProof }: any) => (
      <div data-testid={`actions-${orderId}`}>
        <button
          type="button"
          data-testid={`approve-${orderId}`}
          onClick={() => onApprove(orderId)}
        >
          Approve
        </button>
        <button
          type="button"
          data-testid={`proof-${orderId}`}
          onClick={() => onRequestProof(orderId, "note")}
        >
          Proof
        </button>
      </div>
    ),
  }),
);

import { DelegatedOrdersPage } from "./DelegatedOrdersPage";

describe("DelegatedOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDelegatedOrders.mockReturnValue({ data: [], isLoading: false });
    mockUseDelegateOrderActions.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    mockUseDelegationContext.mockReturnValue({
      delegations: [],
      isLoading: false,
      isDelegateFor: () => false,
      canApprove: () => false,
      canRequestProof: () => false,
    });
  });

  it("renders the page with title", () => {
    render(<DelegatedOrdersPage />);
    expect(screen.getByTestId("delegated-orders-page")).toBeInTheDocument();
    expect(screen.getByText("delegatedOrders")).toBeInTheDocument();
  });

  it("renders the delegated orders list", () => {
    render(<DelegatedOrdersPage />);
    expect(screen.getByTestId("delegated-orders-list")).toBeInTheDocument();
  });

  it("returns null when context is loading", () => {
    mockUseDelegationContext.mockReturnValue({
      delegations: [],
      isLoading: true,
      isDelegateFor: () => false,
      canApprove: () => false,
      canRequestProof: () => false,
    });
    const { container } = render(<DelegatedOrdersPage />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when orders are loading", () => {
    mockUseDelegatedOrders.mockReturnValue({ data: [], isLoading: true });
    const { container } = render(<DelegatedOrdersPage />);
    expect(container.innerHTML).toBe("");
  });

  it("renders with order groups data", () => {
    mockUseDelegatedOrders.mockReturnValue({
      data: [
        {
          seller: {
            seller_id: "s1",
            seller_display_name: "Seller",
            permissions: ["orders.approve"],
          },
          orders: [{ id: "o1", payment_status: "pending_verification" }],
        },
      ],
      isLoading: false,
    });

    render(<DelegatedOrdersPage />);
    expect(screen.getByTestId("order-o1")).toBeInTheDocument();
    expect(screen.getByTestId("actions-o1")).toBeInTheDocument();
  });

  it("calls approve mutation when handleApprove is triggered", () => {
    mockUseDelegatedOrders.mockReturnValue({
      data: [
        {
          seller: {
            seller_id: "s1",
            seller_display_name: "Seller",
            permissions: ["orders.approve"],
          },
          orders: [{ id: "o1", payment_status: "pending_verification" }],
        },
      ],
      isLoading: false,
    });

    render(<DelegatedOrdersPage />);
    fireEvent.click(screen.getByTestId("approve-o1"));

    expect(mockMutate).toHaveBeenCalledWith({
      orderId: "o1",
      action: "approve",
    });
  });

  it("calls request_proof mutation when handleRequestProof is triggered", () => {
    mockUseDelegatedOrders.mockReturnValue({
      data: [
        {
          seller: {
            seller_id: "s1",
            seller_display_name: "Seller",
            permissions: ["orders.request_proof"],
          },
          orders: [{ id: "o1", payment_status: "evidence_requested" }],
        },
      ],
      isLoading: false,
    });

    render(<DelegatedOrdersPage />);
    fireEvent.click(screen.getByTestId("proof-o1"));

    expect(mockMutate).toHaveBeenCalledWith({
      orderId: "o1",
      action: "request_proof",
      seller_note: "note",
    });
  });
});
