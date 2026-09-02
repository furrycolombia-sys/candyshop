import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockHasPermission = vi.fn(() => true);
const mockAddMutate = vi.fn();
const mockRemoveMutate = vi.fn();
const mockUseDelegates = vi.fn(() => ({ data: [], isLoading: false }));
const mockUseCurrentUser = vi.fn(() => ({
  user: { id: "seller-1" } as { id: string } | null,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({
    hasPermission: mockHasPermission,
  }),
}));

vi.mock("@/shared/application/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock("@/features/seller-admins/application/hooks/useDelegates", () => ({
  useDelegates: () => mockUseDelegates(),
}));

vi.mock(
  "@/features/seller-admins/application/hooks/useDelegateMutations",
  () => ({
    useAddDelegate: () => ({ mutate: mockAddMutate, isPending: false }),
    useRemoveDelegate: () => ({ mutate: mockRemoveMutate, isPending: false }),
  }),
);

vi.mock(
  "@/features/seller-admins/presentation/components/DelegateList",
  () => ({
    DelegateList: ({
      onRemove,
    }: {
      onRemove: (adminUserId: string) => void;
    }) => (
      <div data-testid="delegate-list">
        <button
          type="button"
          data-testid="trigger-remove"
          onClick={() => onRemove("user-abc")}
        >
          Remove
        </button>
      </div>
    ),
  }),
);

vi.mock(
  "@/features/seller-admins/presentation/components/AddDelegateForm",
  () => ({
    AddDelegateForm: ({
      onAdd,
    }: {
      onAdd: (adminUserId: string, permissions: string[]) => void;
    }) => (
      <div data-testid="add-delegate-form">
        <button
          type="button"
          data-testid="trigger-add"
          onClick={() => onAdd("new-user", ["read"])}
        >
          Add
        </button>
      </div>
    ),
  }),
);

vi.mock("@/shared/presentation/components/AccessDeniedState", () => ({
  AccessDeniedState: () => <div data-testid="access-denied" />,
}));

import { DelegateManagementPage } from "./DelegateManagementPage";

describe("DelegateManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockUseDelegates.mockReturnValue({ data: [], isLoading: false });
    mockUseCurrentUser.mockReturnValue({ user: { id: "seller-1" } });
  });

  it("renders the page with title", () => {
    render(<DelegateManagementPage />);
    expect(screen.getByTestId("delegate-management-page")).toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("renders delegate list and add form", () => {
    render(<DelegateManagementPage />);
    expect(screen.getByTestId("delegate-list")).toBeInTheDocument();
    expect(screen.getByTestId("add-delegate-form")).toBeInTheDocument();
  });

  it("shows access denied when missing permission", () => {
    mockHasPermission.mockReturnValue(false);
    render(<DelegateManagementPage />);
    expect(
      screen.queryByTestId("delegate-management-page"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
  });

  it("returns null when isLoading is true", () => {
    mockUseDelegates.mockReturnValue({ data: [], isLoading: true });
    const { container } = render(<DelegateManagementPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("handleAdd calls addMutation.mutate with sellerId", () => {
    render(<DelegateManagementPage />);
    fireEvent.click(screen.getByTestId("trigger-add"));
    expect(mockAddMutate).toHaveBeenCalledWith({
      sellerId: "seller-1",
      adminUserId: "new-user",
      permissions: ["read"],
      productId: "",
    });
  });

  it("handleAdd does nothing when sellerId is undefined", () => {
    mockUseCurrentUser.mockReturnValue({ user: null });
    render(<DelegateManagementPage />);
    fireEvent.click(screen.getByTestId("trigger-add"));
    expect(mockAddMutate).not.toHaveBeenCalled();
  });

  it("handleRemove calls removeMutation.mutate with sellerId", () => {
    render(<DelegateManagementPage />);
    fireEvent.click(screen.getByTestId("trigger-remove"));
    expect(mockRemoveMutate).toHaveBeenCalledWith({
      sellerId: "seller-1",
      adminUserId: "user-abc",
      productId: "",
    });
  });

  it("handleRemove does nothing when sellerId is undefined", () => {
    mockUseCurrentUser.mockReturnValue({ user: null });
    render(<DelegateManagementPage />);
    fireEvent.click(screen.getByTestId("trigger-remove"));
    expect(mockRemoveMutate).not.toHaveBeenCalled();
  });
});
