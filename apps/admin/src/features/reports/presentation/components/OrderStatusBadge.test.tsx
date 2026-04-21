import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { OrderStatusBadge } from "./OrderStatusBadge";

import type { OrderStatus } from "@/features/reports/domain/types";

const ALL_STATUSES: OrderStatus[] = [
  "pending",
  "awaiting_payment",
  "pending_verification",
  "evidence_requested",
  "approved",
  "rejected",
  "expired",
];

describe("OrderStatusBadge", () => {
  it("renders a span with the translated status text", () => {
    render(<OrderStatusBadge status="approved" />);
    expect(screen.getByText("status.approved")).toBeInTheDocument();
  });

  it("renders a testid tied to the status", () => {
    render(<OrderStatusBadge status="rejected" />);
    expect(
      screen.getByTestId("order-status-badge-rejected"),
    ).toBeInTheDocument();
  });

  it.each(ALL_STATUSES)("renders without crashing for status: %s", (status) => {
    const { unmount } = render(<OrderStatusBadge status={status} />);
    expect(
      screen.getByTestId(`order-status-badge-${status}`),
    ).toBeInTheDocument();
    unmount();
  });

  it("renders as a span element", () => {
    render(<OrderStatusBadge status="pending" />);
    const span = screen.getByTestId("order-status-badge-pending");
    expect(span.tagName).toBe("SPAN");
  });

  it("renders the correct status text for each status", () => {
    render(<OrderStatusBadge status="awaiting_payment" />);
    expect(screen.getByText("status.awaiting_payment")).toBeInTheDocument();
  });
});
