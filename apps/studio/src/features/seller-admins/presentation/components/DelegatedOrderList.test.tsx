import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

import { DelegatedOrderList } from "./DelegatedOrderList";

const mockGroups = [
  {
    seller: {
      seller_id: "seller-1",
      seller_display_name: "Test Seller",
      permissions: ["orders.approve" as const],
    },
    orders: [
      { id: "order-1", payment_status: "pending_verification" },
      {
        id: "order-2",
        payment_status: "evidence_requested",
        seller_note: "Need receipt",
      },
    ],
  },
];

describe("DelegatedOrderList", () => {
  it("renders empty state when no groups", () => {
    render(<DelegatedOrderList groups={[]} />);
    expect(screen.getByTestId("delegated-orders-list")).toBeInTheDocument();
    expect(screen.getByText("noOrders")).toBeInTheDocument();
  });

  it("renders order groups with correct test IDs", () => {
    render(<DelegatedOrderList groups={mockGroups} />);
    expect(
      screen.getByTestId("delegated-order-group-seller-1"),
    ).toBeInTheDocument();
    expect(screen.getByText("Test Seller")).toBeInTheDocument();
  });

  it("renders individual orders with correct test IDs", () => {
    render(<DelegatedOrderList groups={mockGroups} />);
    expect(screen.getByTestId("delegated-order-order-1")).toBeInTheDocument();
    expect(screen.getByTestId("delegated-order-order-2")).toBeInTheDocument();
  });

  it("renders seller note when present", () => {
    render(<DelegatedOrderList groups={mockGroups} />);
    expect(screen.getByText("Need receipt")).toBeInTheDocument();
  });

  it("renders actions when renderActions is provided", () => {
    render(
      <DelegatedOrderList
        groups={mockGroups}
        renderActions={(order) => (
          <button type="button" data-testid={`action-${order.id}`}>
            Act
          </button>
        )}
      />,
    );
    expect(screen.getByTestId("action-order-1")).toBeInTheDocument();
    expect(screen.getByTestId("action-order-2")).toBeInTheDocument();
  });
});
