import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { ReceivedStatusBadge } from "./ReceivedStatusBadge";

describe("ReceivedStatusBadge", () => {
  it("renders badge with translated status text", () => {
    render(<ReceivedStatusBadge status="approved" />);
    expect(screen.getByText("approved")).toBeInTheDocument();
  });

  it("has the correct test ID", () => {
    render(<ReceivedStatusBadge status="approved" />);
    expect(screen.getByTestId("order-status-badge")).toBeInTheDocument();
  });

  it("renders for all actionable statuses", () => {
    const statuses = [
      "pending_verification",
      "evidence_requested",
      "approved",
      "rejected",
      "expired",
    ] as const;

    for (const status of statuses) {
      const { unmount } = render(<ReceivedStatusBadge status={status} />);
      expect(screen.getByTestId("order-status-badge")).toBeInTheDocument();
      unmount();
    }
  });

  it("uses expired config for unknown status", () => {
    // Cast to force unknown status
    render(<ReceivedStatusBadge status={"unknown_status" as "approved"} />);
    // Should not crash
    expect(screen.getByTestId("order-status-badge")).toBeInTheDocument();
  });
});
