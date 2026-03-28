import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { OrderStatusBadge } from "./OrderStatusBadge";

describe("OrderStatusBadge", () => {
  it("renders the translated status text", () => {
    render(<OrderStatusBadge status="approved" />);
    expect(screen.getByText("status.approved")).toBeInTheDocument();
  });

  it("applies the correct test ID", () => {
    render(<OrderStatusBadge status="pending_verification" />);
    expect(
      screen.getByTestId("order-status-pending_verification"),
    ).toBeInTheDocument();
  });

  it("renders for all known statuses without crashing", () => {
    const statuses = [
      "pending",
      "awaiting_payment",
      "pending_verification",
      "evidence_requested",
      "approved",
      "rejected",
      "expired",
      "paid",
    ] as const;

    for (const status of statuses) {
      const { unmount } = render(<OrderStatusBadge status={status} />);
      expect(screen.getByText(`status.${status}`)).toBeInTheDocument();
      unmount();
    }
  });
});
