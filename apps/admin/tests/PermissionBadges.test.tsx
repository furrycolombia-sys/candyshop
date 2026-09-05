import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

import { PermissionBadges } from "@/features/users/presentation/components/delegates/PermissionBadges";

describe("PermissionBadges", () => {
  it("renders nothing when permissions is empty", () => {
    render(<PermissionBadges permissions={[]} />);
    expect(screen.getByTestId("permission-badges")).toBeEmptyDOMElement();
  });

  it("renders a badge for each permission", () => {
    render(
      <PermissionBadges permissions={["products.create", "products.update"]} />,
    );
    expect(screen.getAllByText(/^t:/).length).toBe(2);
  });

  it("translates permission key by replacing dots with underscores", () => {
    render(<PermissionBadges permissions={["orders.read"]} />);
    expect(screen.getByText("t:perm.orders_read")).toBeInTheDocument();
  });

  it("handles multiple dot segments", () => {
    render(<PermissionBadges permissions={["seller.payment_methods.read"]} />);
    expect(
      screen.getByText("t:perm.seller_payment_methods_read"),
    ).toBeInTheDocument();
  });
});
