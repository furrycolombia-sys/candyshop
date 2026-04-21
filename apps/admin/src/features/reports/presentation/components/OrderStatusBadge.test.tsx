import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/shared/infrastructure/config/tid", () => ({
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

  it("applies success color class for approved status", () => {
    render(<OrderStatusBadge status="approved" />);
    const span = screen.getByTestId("order-status-badge-approved");
    expect(span.className).toContain("text-success");
  });

  it("applies destructive color class for rejected status", () => {
    render(<OrderStatusBadge status="rejected" />);
    const span = screen.getByTestId("order-status-badge-rejected");
    expect(span.className).toContain("text-destructive");
  });

  it("applies muted style for expired status", () => {
    render(<OrderStatusBadge status="expired" />);
    const span = screen.getByTestId("order-status-badge-expired");
    expect(span.className).toContain("text-muted-foreground");
  });

  it("applies info style for awaiting_payment status", () => {
    render(<OrderStatusBadge status="awaiting_payment" />);
    const span = screen.getByTestId("order-status-badge-awaiting_payment");
    expect(span.className).toContain("text-info");
  });

  it("renders as an inline-flex span", () => {
    render(<OrderStatusBadge status="pending" />);
    const span = screen.getByTestId("order-status-badge-pending");
    expect(span.tagName).toBe("SPAN");
    expect(span.className).toContain("inline-flex");
  });
});
