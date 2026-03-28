import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  },
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/shared/infrastructure/config", () => ({
  appUrls: { payments: "http://localhost:5005/payments" },
}));

const mockUsePendingOrderCount = vi.fn();

vi.mock("@/features/orders/application/hooks/usePendingOrderCount", () => ({
  usePendingOrderCount: () => mockUsePendingOrderCount(),
}));

import { PendingOrdersBadge } from "./PendingOrdersBadge";

describe("PendingOrdersBadge", () => {
  it("returns null when count is 0", () => {
    mockUsePendingOrderCount.mockReturnValue({ data: 0 });
    const { container } = render(<PendingOrdersBadge />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when count is undefined", () => {
    mockUsePendingOrderCount.mockReturnValue({ data: undefined });
    const { container } = render(<PendingOrdersBadge />);
    expect(container.innerHTML).toBe("");
  });

  it("renders badge with count", () => {
    mockUsePendingOrderCount.mockReturnValue({ data: 5 });
    render(<PendingOrdersBadge />);
    expect(screen.getByTestId("pending-orders-badge")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders link to received orders page", () => {
    mockUsePendingOrderCount.mockReturnValue({ data: 3 });
    render(<PendingOrdersBadge />);
    const link = screen.getByTestId("pending-orders-badge");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toContain("/orders/received");
  });

  it("renders the translated pending orders text", () => {
    mockUsePendingOrderCount.mockReturnValue({ data: 2 });
    render(<PendingOrdersBadge />);
    expect(screen.getByText(/pendingOrders/)).toBeInTheDocument();
  });
});
