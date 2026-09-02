import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import type { OrderWithItems } from "@/features/orders/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock(
  "@/features/orders/presentation/components/ResubmitEvidenceForm",
  () => ({
    ResubmitEvidenceForm: ({
      orderId,
    }: {
      orderId: string;
      sellerNote: string | null;
      onSubmit: () => void;
      isPending: boolean;
    }) => <div data-testid={`resubmit-form-${orderId}`}>ResubmitForm</div>,
  }),
);

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { StatusContent } from "./StatusContent";

function makeOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
  return {
    id: "order-1",
    user_id: "user-1",
    seller_id: "seller-1",
    payment_status: "pending_verification",
    total: 10_000,
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

describe("StatusContent", () => {
  const onResubmit = vi.fn();

  it("renders ResubmitEvidenceForm for evidence_requested", () => {
    const order = makeOrder({ payment_status: "evidence_requested" });
    render(
      <StatusContent order={order} onResubmit={onResubmit} isPending={false} />,
    );
    expect(screen.getByTestId("resubmit-form-order-1")).toBeInTheDocument();
  });

  it("renders approved message", () => {
    const order = makeOrder({ payment_status: "approved" });
    render(
      <StatusContent order={order} onResubmit={onResubmit} isPending={false} />,
    );
    expect(screen.getByText("orderApproved")).toBeInTheDocument();
    expect(screen.getByTestId("order-approved-order-1")).toBeInTheDocument();
  });

  it("renders rejected message", () => {
    const order = makeOrder({ payment_status: "rejected" });
    render(
      <StatusContent order={order} onResubmit={onResubmit} isPending={false} />,
    );
    expect(screen.getByText("orderCancelled")).toBeInTheDocument();
  });

  it("renders seller note when rejected with a note", () => {
    const order = makeOrder({
      payment_status: "rejected",
      seller_note: "Bad receipt",
    });
    render(
      <StatusContent order={order} onResubmit={onResubmit} isPending={false} />,
    );
    expect(screen.getByText("Bad receipt")).toBeInTheDocument();
    expect(screen.getByText("sellerNote")).toBeInTheDocument();
  });

  it("renders pending_verification message", () => {
    const order = makeOrder({ payment_status: "pending_verification" });
    render(
      <StatusContent order={order} onResubmit={onResubmit} isPending={false} />,
    );
    expect(screen.getByText("waitingForSeller")).toBeInTheDocument();
  });

  it("renders expired message", () => {
    const order = makeOrder({ payment_status: "expired" });
    render(
      <StatusContent order={order} onResubmit={onResubmit} isPending={false} />,
    );
    expect(screen.getByText("expired")).toBeInTheDocument();
  });

  it("renders nothing for unknown status", () => {
    const order = makeOrder({
      payment_status: "awaiting_payment" as OrderWithItems["payment_status"],
    });
    const { container } = render(
      <StatusContent order={order} onResubmit={onResubmit} isPending={false} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
