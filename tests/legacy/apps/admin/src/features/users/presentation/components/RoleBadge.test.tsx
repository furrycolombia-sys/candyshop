import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RoleBadge } from "./RoleBadge";

import type { UserRole } from "@/features/users/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

describe("RoleBadge", () => {
  const roles: UserRole[] = ["admin", "seller", "buyer", "custom", "none"];

  it.each(roles)("renders the '%s' role label", (role) => {
    render(<RoleBadge role={role} />);
    expect(screen.getByText(role)).toBeInTheDocument();
  });

  it.each(roles)("includes the role test-id for '%s'", (role) => {
    render(<RoleBadge role={role} />);
    expect(screen.getByTestId(`role-badge-${role}`)).toBeInTheDocument();
  });

  it("applies destructive variant for admin role", () => {
    // eslint-disable-next-line jsx-a11y/aria-role -- `role` is a custom prop on RoleBadge, not an HTML ARIA role
    render(<RoleBadge role="admin" />);
    const badge = screen.getByTestId("role-badge-admin");
    expect(badge).toHaveAttribute("data-variant", "admin");
  });

  it("applies primary variant for seller role", () => {
    // eslint-disable-next-line jsx-a11y/aria-role -- `role` is a custom prop on RoleBadge, not an HTML ARIA role
    render(<RoleBadge role="seller" />);
    const badge = screen.getByTestId("role-badge-seller");
    expect(badge).toHaveAttribute("data-variant", "seller");
  });

  it("applies muted variant for none role", () => {
    render(<RoleBadge role="none" />);
    const badge = screen.getByTestId("role-badge-none");
    expect(badge).toHaveAttribute("data-variant", "none");
  });
});
