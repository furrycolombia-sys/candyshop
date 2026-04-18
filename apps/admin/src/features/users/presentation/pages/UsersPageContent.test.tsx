import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UsersPageContent } from "./UsersPageContent";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: vi.fn(() => ({ grantedKeys: ["users.export"] })),
}));

vi.mock("@/features/audit/application/hooks/useAuditLog", () => ({
  useLogExport: vi.fn(() => ({
    mutate: vi.fn(),
  })),
}));

vi.mock("nuqs", () => ({
  useQueryStates: vi.fn(() => [{ search: "", page: 1 }, vi.fn()]),
  parseAsString: { withDefault: () => ({}) },
  parseAsInteger: { withDefault: () => ({}) },
}));

vi.mock("@/shared/infrastructure/i18n", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

vi.mock("@/features/users/application/hooks/useUsers", () => ({
  useUsers: vi.fn(() => ({
    data: { users: [], total: 0 },
    isLoading: false,
  })),
}));

vi.mock("@/features/users/presentation/components/UserTable", () => ({
  UserTable: ({
    filterInput,
    onFilterInputChange,
  }: {
    filterInput: string;
    onFilterInputChange: (v: string) => void;
  }) => (
    <div data-testid="mock-user-table">
      Mock User Table
      <input
        data-testid="mock-filter"
        value={filterInput}
        onChange={(e) => onFilterInputChange(e.target.value)}
      />
    </div>
  ),
}));

describe("UsersPageContent", () => {
  it("renders page structure and title", () => {
    render(<UsersPageContent />);
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("subtitle")).toBeInTheDocument();
    expect(screen.getByTestId("mock-user-table")).toBeInTheDocument();
  });

  it("handles hoisted filter state passed to UserTable", () => {
    render(<UsersPageContent />);
    const input = screen.getByTestId("mock-filter");
    fireEvent.change(input, { target: { value: "test-query" } });
    expect(input).toHaveValue("test-query");
  });
});
