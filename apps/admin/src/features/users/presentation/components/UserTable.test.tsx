import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserTable } from "./UserTable";

import type { UserProfileSummary } from "@/features/users/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/features/users/application/hooks/useUserPermissions", () => ({
  useUserPermissions: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: vi.fn(() => ({ grantedKeys: ["users.export"] })),
}));

describe("UserTable", () => {
  const mockUsers: UserProfileSummary[] = [
    {
      id: "1",
      email: "test@example.com",
      display_name: "Test User",
      last_seen_at: "2026-04-10T12:00:00Z",
      display_avatar_url: null,
      avatar_url: null,
    },
    {
      id: "2",
      email: "buyer@example.com",
      display_name: "Buyer User",
      last_seen_at: null,
      display_avatar_url: null,
      avatar_url: null,
    },
  ];

  const defaultProps = {
    users: mockUsers,
    total: 2,
    isLoading: false,
    page: 1,
    onPageChange: vi.fn(),
    onSelectUser: vi.fn(),
    selectedUsers: new Set<string>(),
    onSelectUsersChange: vi.fn(),
    filterInput: "",
    onFilterInputChange: vi.fn(),
    roleFilter: "all",
    onRoleFilterChange: vi.fn(),
    itemFilter: "all",
    onItemFilterChange: vi.fn(),
    canExport: true,
    onExportCsv: vi.fn(),
  };

  it("renders users and filter inputs correctly", () => {
    render(<UserTable {...defaultProps} />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("Buyer User")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("searchPlaceholder"),
    ).toBeInTheDocument();
  });

  it("triggers filter changes via props", () => {
    render(<UserTable {...defaultProps} />);

    // Simulate user typing in the text field
    const input = screen.getByPlaceholderText("searchPlaceholder");
    fireEvent.change(input, { target: { value: "Buyer" } });
    expect(defaultProps.onFilterInputChange).toHaveBeenCalledWith("Buyer");
  });

  it("calls export excel when clicking download", () => {
    const propsWithSelection = {
      ...defaultProps,
      selectedUsers: new Set(["1"]),
    };
    render(<UserTable {...propsWithSelection} />);
    const downloadBtn = screen.getByRole("button", {
      name: /Export Selected/i,
    });
    fireEvent.click(downloadBtn);
    expect(defaultProps.onExportCsv).toHaveBeenCalled();
  });

  it("shows loading state", () => {
    render(<UserTable {...defaultProps} isLoading={true} users={[]} />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<UserTable {...defaultProps} users={[]} total={0} />);
    expect(screen.getByText("noResults")).toBeInTheDocument();
  });
});
