import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <svg data-testid="arrow-left" />,
}));

vi.mock("ui", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("../components/UserHeader", () => ({
  UserHeader: ({ user }: { user: { email: string } }) => (
    <div data-testid="user-header">{user.email}</div>
  ),
}));

vi.mock("../components/TemplateButtons", () => ({
  TemplateButtons: ({
    onToggleTemplate,
    onReset,
  }: {
    onToggleTemplate: (key: string, active: boolean) => void;
    onReset: () => void;
  }) => (
    <div data-testid="template-buttons">
      <button
        type="button"
        data-testid="toggle-template"
        onClick={() => onToggleTemplate("buyer", true)}
      />
      <button type="button" data-testid="reset-btn" onClick={() => onReset()} />
    </div>
  ),
}));

vi.mock("../components/PermissionGroupCard", () => ({
  PermissionGroupCard: ({ groupKey }: { groupKey: string }) => (
    <div data-testid={`perm-group-${groupKey}`} />
  ),
}));

vi.mock("../components/UserDelegatesCard", () => ({
  UserDelegatesCard: () => <div data-testid="delegates-card" />,
}));

const mockToggleMutate = vi.fn();
const mockTemplateMutate = vi.fn();
const mockRouterPush = vi.fn();

vi.mock("@/features/users/application/hooks/useTogglePermission", () => ({
  useTogglePermission: () => ({
    mutate: mockToggleMutate,
    isPending: false,
  }),
}));

vi.mock("@/features/users/application/hooks/useApplyTemplate", () => ({
  useApplyTemplate: () => ({
    mutate: mockTemplateMutate,
    isPending: false,
  }),
}));

vi.mock("@/features/users/application/utils/templatePermissions", () => ({
  getUpdatedPermissionKeysForTemplateToggle: vi
    .fn()
    .mockReturnValue(["products.read"]),
}));

const mockProfileData = {
  id: "user-1",
  email: "user@example.com",
  display_name: "Test User",
  display_avatar_url: null,
  avatar_url: null,
  last_seen_at: null,
};

const mockUseUserProfile = vi.fn();
const mockUseUserPermissions = vi.fn();

vi.mock("@/features/users/application/hooks/useUserProfile", () => ({
  useUserProfile: (...args: unknown[]) => mockUseUserProfile(...args),
}));

vi.mock("@/features/users/application/hooks/useUserPermissions", () => ({
  useUserPermissions: (...args: unknown[]) => mockUseUserPermissions(...args),
}));

vi.mock("@/shared/infrastructure/i18n", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

import { UserDetailPageContent } from "./UserDetailPageContent";

const defaultProps = {
  userId: "user-1",
  canCreate: true,
  canDelete: true,
  canManageDelegates: true,
};

describe("UserDetailPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserProfile.mockReturnValue({
      data: mockProfileData,
      isLoading: false,
    });
    mockUseUserPermissions.mockReturnValue({
      data: ["products.read"],
      isLoading: false,
    });
  });

  it("shows loading state while profile or permissions are loading", () => {
    mockUseUserProfile.mockReturnValue({ data: undefined, isLoading: true });
    render(<UserDetailPageContent {...defaultProps} />);
    expect(screen.getByText("t:loading")).toBeInTheDocument();
  });

  it("shows no-results state when profile is null and not loading", () => {
    mockUseUserProfile.mockReturnValue({ data: null, isLoading: false });
    render(<UserDetailPageContent {...defaultProps} />);
    expect(screen.getByText("t:noResults")).toBeInTheDocument();
  });

  it("renders user detail page when profile is available", () => {
    render(<UserDetailPageContent {...defaultProps} />);
    expect(screen.getByTestId("user-detail-page")).toBeInTheDocument();
  });

  it("renders UserHeader with profile data", () => {
    render(<UserDetailPageContent {...defaultProps} />);
    expect(screen.getByTestId("user-header")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("renders TemplateButtons", () => {
    render(<UserDetailPageContent {...defaultProps} />);
    expect(screen.getByTestId("template-buttons")).toBeInTheDocument();
  });

  it("renders permission group cards for each group", () => {
    render(<UserDetailPageContent {...defaultProps} />);
    expect(screen.getByTestId("perm-group-products")).toBeInTheDocument();
    expect(screen.getByTestId("perm-group-orders")).toBeInTheDocument();
  });

  it("renders UserDelegatesCard when canManageDelegates is true", () => {
    render(
      <UserDetailPageContent {...defaultProps} canManageDelegates={true} />,
    );
    expect(screen.getByTestId("delegates-card")).toBeInTheDocument();
  });

  it("does not render UserDelegatesCard when canManageDelegates is false", () => {
    render(
      <UserDetailPageContent {...defaultProps} canManageDelegates={false} />,
    );
    expect(screen.queryByTestId("delegates-card")).not.toBeInTheDocument();
  });

  it("navigates back when back button is clicked", () => {
    render(<UserDetailPageContent {...defaultProps} />);
    fireEvent.click(screen.getByTestId("back-to-users"));
    expect(mockRouterPush).toHaveBeenCalledWith("/users");
  });

  it("calls templateMutation.mutate when handleToggleTemplate is triggered", () => {
    render(<UserDetailPageContent {...defaultProps} />);
    fireEvent.click(screen.getByTestId("toggle-template"));
    expect(mockTemplateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
    );
  });

  it("handleToggleTemplate does nothing when canCreate or canDelete is false", () => {
    render(
      <UserDetailPageContent
        {...defaultProps}
        canCreate={false}
        canDelete={true}
      />,
    );
    fireEvent.click(screen.getByTestId("toggle-template"));
    expect(mockTemplateMutate).not.toHaveBeenCalled();
  });

  it("calls templateMutation.mutate with empty keys when handleReset is triggered", () => {
    render(<UserDetailPageContent {...defaultProps} />);
    fireEvent.click(screen.getByTestId("reset-btn"));
    expect(mockTemplateMutate).toHaveBeenCalledWith({
      userId: "user-1",
      permissionKeys: [],
    });
  });

  it("handleReset does nothing when canDelete is false", () => {
    render(<UserDetailPageContent {...defaultProps} canDelete={false} />);
    fireEvent.click(screen.getByTestId("reset-btn"));
    expect(mockTemplateMutate).not.toHaveBeenCalled();
  });
});
