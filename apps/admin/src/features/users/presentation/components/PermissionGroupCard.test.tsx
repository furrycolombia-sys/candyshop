import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PermissionGroupCard } from "./PermissionGroupCard";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

describe("PermissionGroupCard", () => {
  const defaultProps = {
    groupKey: "orders",
    labelKey: "orders",
    permissions: ["orders.view", "orders.edit", "orders.delete"],
    grantedKeys: ["orders.view"],
    onToggle: vi.fn(),
    isPending: false,
    canManage: true,
  };

  it("renders the group label", () => {
    render(<PermissionGroupCard {...defaultProps} />);
    expect(screen.getByText("groups.orders")).toBeInTheDocument();
  });

  it("renders all permission checkboxes", () => {
    render(<PermissionGroupCard {...defaultProps} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
  });

  it("checks granted permissions and leaves ungrated ones unchecked", () => {
    render(<PermissionGroupCard {...defaultProps} />);
    const checkboxes = screen.getAllByRole("checkbox");
    // orders.view is granted
    expect(checkboxes[0]).toBeChecked();
    // orders.edit and orders.delete are not granted
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it("calls onToggle with correct args when a checkbox is changed", () => {
    const onToggle = vi.fn();
    render(<PermissionGroupCard {...defaultProps} onToggle={onToggle} />);
    const checkboxes = screen.getAllByRole("checkbox");
    // Click unchecked "orders.edit" → should grant it
    fireEvent.click(checkboxes[1]);
    expect(onToggle).toHaveBeenCalledWith("orders.edit", true);
  });

  it("calls onToggle to revoke a currently-granted permission", () => {
    const onToggle = vi.fn();
    render(<PermissionGroupCard {...defaultProps} onToggle={onToggle} />);
    const checkboxes = screen.getAllByRole("checkbox");
    // Click checked "orders.view" → should revoke it
    fireEvent.click(checkboxes[0]);
    expect(onToggle).toHaveBeenCalledWith("orders.view", false);
  });

  it("disables checkboxes when isPending is true", () => {
    render(<PermissionGroupCard {...defaultProps} isPending={true} />);
    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) expect(cb).toBeDisabled();
  });

  it("disables checkboxes when canManage is false", () => {
    render(<PermissionGroupCard {...defaultProps} canManage={false} />);
    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) expect(cb).toBeDisabled();
  });

  it("renders with no permissions gracefully", () => {
    render(<PermissionGroupCard {...defaultProps} permissions={[]} />);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByText("groups.orders")).toBeInTheDocument();
  });
});
