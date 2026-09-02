import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

const mockSetParams = vi.fn();
vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return {
    ...actual,
    useQueryStates: vi.fn(() => [
      { search: "", page: 1, roleFilter: "all", itemFilter: "all" },
      mockSetParams,
    ]),
  };
});

const mockLogExport = vi.fn();
vi.mock("@/features/audit/application/hooks/useAuditLog", () => ({
  useLogExport: () => ({ mutate: mockLogExport }),
}));

const mockFetchPermissions = vi.fn();
vi.mock("@/features/users/application/hooks/useUserPermissionsBatch", () => ({
  useUserPermissionsBatch: () => ({
    fetchPermissions: mockFetchPermissions,
  }),
}));

const mockFetchReceipts = vi.fn();
vi.mock("@/features/users/application/hooks/useUserReceiptsBatch", () => ({
  useUserReceiptsBatch: () => ({
    fetchReceipts: mockFetchReceipts,
  }),
}));

const mockUseUsers = vi.fn();
vi.mock("@/features/users/application/hooks/useUsers", () => ({
  useUsers: (...args: unknown[]) => mockUseUsers(...args),
}));

vi.mock("@/features/users/application/utils/exportCsv", () => ({
  exportUsersToExcel: vi.fn(() => "excel-content"),
  downloadExcel: vi.fn(),
}));

let mockGrantedKeys: string[] = [];
vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({ grantedKeys: mockGrantedKeys }),
}));

const mockSetError = vi.fn();
vi.mock("@/shared/application/context/ErrorContext", () => ({
  useErrorContext: () => ({ setError: mockSetError }),
}));

const mockRouterPush = vi.fn();
vi.mock("@/shared/infrastructure/i18n", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// Capture callbacks from UserTable so tests can invoke them
let capturedCanExport = false;
let capturedUsers: Array<{ id: string }> = [];
let capturedIsLoading = false;

vi.mock("@/features/users/presentation/components/UserTable", () => ({
  UserTable: (props: {
    users: Array<{ id: string }>;
    total: number;
    isLoading: boolean;
    page: number;
    onPageChange: (p: number) => void;
    onSelectUser: (id: string) => void;
    selectedUsers: Set<string>;
    onSelectUsersChange: (s: Set<string>) => void;
    filterInput: string;
    onFilterInputChange: (v: string) => void;
    roleFilter: string;
    onRoleFilterChange: (v: string) => void;
    itemFilter: string;
    onItemFilterChange: (v: string) => void;
    canExport: boolean;
    onExportExcel: () => void;
  }) => {
    capturedCanExport = props.canExport;
    capturedUsers = props.users;
    capturedIsLoading = props.isLoading;
    return (
      <div data-testid="user-table">
        <button
          type="button"
          data-testid="trigger-select-user"
          onClick={() => props.onSelectUser("user-1")}
        />
        <button
          type="button"
          data-testid="trigger-export"
          onClick={() => props.onExportExcel()}
        />
        <button
          type="button"
          data-testid="trigger-select-users"
          onClick={() => {
            props.onSelectUsersChange(new Set(["u1"]));
          }}
        />
      </div>
    );
  },
}));

import { UsersPageContent } from "@/features/users/presentation/pages/UsersPageContent";

const mockUsers = [
  {
    id: "u1",
    email: "a@example.com",
    display_name: "A",
    last_seen_at: null,
    display_avatar_url: null,
    avatar_url: null,
  },
  {
    id: "u2",
    email: "b@example.com",
    display_name: "B",
    last_seen_at: null,
    display_avatar_url: null,
    avatar_url: null,
  },
];

describe("UsersPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGrantedKeys = [];
    capturedCanExport = false;
    capturedUsers = [];
    capturedIsLoading = false;
    mockUseUsers.mockReturnValue({
      data: { users: mockUsers, total: 2 },
      isLoading: false,
    });
  });

  it("renders the page container", () => {
    render(<UsersPageContent />);
    expect(screen.getByTestId("users-page")).toBeInTheDocument();
  });

  it("renders translated title", () => {
    render(<UsersPageContent />);
    expect(screen.getByTestId("users-title")).toHaveTextContent("t:title");
  });

  it("renders translated subtitle", () => {
    render(<UsersPageContent />);
    expect(screen.getByText("t:subtitle")).toBeInTheDocument();
  });

  it("renders UserTable", () => {
    render(<UsersPageContent />);
    expect(screen.getByTestId("user-table")).toBeInTheDocument();
  });

  it("passes users from useUsers to UserTable", () => {
    render(<UsersPageContent />);
    expect(capturedUsers).toHaveLength(2);
    expect(capturedUsers[0]!.id).toBe("u1");
  });

  it("passes isLoading=false to UserTable when data is ready", () => {
    render(<UsersPageContent />);
    expect(capturedIsLoading).toBe(false);
  });

  it("passes isLoading=true to UserTable when loading", () => {
    mockUseUsers.mockReturnValue({ data: undefined, isLoading: true });
    render(<UsersPageContent />);
    expect(capturedIsLoading).toBe(true);
  });

  it("canExport is false when grantedKeys does not include users.export", () => {
    render(<UsersPageContent />);
    expect(capturedCanExport).toBe(false);
  });

  it("canExport is true when grantedKeys includes users.export", () => {
    mockGrantedKeys = ["users.export"];
    render(<UsersPageContent />);
    expect(capturedCanExport).toBe(true);
  });

  it("useUsers is called with search and page from params", () => {
    render(<UsersPageContent />);
    expect(mockUseUsers).toHaveBeenCalledWith("", 1);
  });

  it("handleSelectUser navigates to /users/:id", () => {
    render(<UsersPageContent />);
    fireEvent.click(screen.getByTestId("trigger-select-user"));
    expect(mockRouterPush).toHaveBeenCalledWith("/users/user-1");
  });

  it("handleExportExcel does nothing when no users are selected", async () => {
    const { downloadExcel } =
      await import("@/features/users/application/utils/exportCsv");
    render(<UsersPageContent />);
    fireEvent.click(screen.getByTestId("trigger-export"));
    expect(downloadExcel).not.toHaveBeenCalled();
    expect(mockLogExport).not.toHaveBeenCalled();
  });

  it("handleExportExcel fetches data, exports and logs when users are selected", async () => {
    const { downloadExcel, exportUsersToExcel } =
      await import("@/features/users/application/utils/exportCsv");
    const mockPermissions = { u1: [] };
    const mockReceiptsData = { u1: [] };
    mockFetchPermissions.mockResolvedValue(mockPermissions);
    mockFetchReceipts.mockResolvedValue(mockReceiptsData);

    render(<UsersPageContent />);

    // Select u1
    fireEvent.click(screen.getByTestId("trigger-select-users"));

    // Trigger export
    fireEvent.click(screen.getByTestId("trigger-export"));

    await waitFor(() => {
      expect(mockFetchPermissions).toHaveBeenCalled();
      expect(mockFetchReceipts).toHaveBeenCalledWith(["u1"]);
      expect(exportUsersToExcel).toHaveBeenCalled();
      expect(downloadExcel).toHaveBeenCalled();
      expect(mockLogExport).toHaveBeenCalledWith({ table: "users", count: 1 });
    });
  });

  it("handleExportExcel calls setError when export throws", async () => {
    mockFetchPermissions.mockRejectedValue(new Error("network error"));
    mockFetchReceipts.mockResolvedValue({});

    render(<UsersPageContent />);

    // Select u1
    fireEvent.click(screen.getByTestId("trigger-select-users"));

    fireEvent.click(screen.getByTestId("trigger-export"));

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("t:exportError");
      expect(mockLogExport).not.toHaveBeenCalled();
    });
  });
});
