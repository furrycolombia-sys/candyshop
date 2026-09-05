import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

const mockHasPermission = vi.fn();

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({
    hasPermission: mockHasPermission,
    grantedKeys: [],
    isAuthenticated: true,
  }),
}));

vi.mock("@/features/users/presentation/pages/UserDetailPageContent", () => ({
  UserDetailPageContent: (props: Record<string, unknown>) => (
    <div
      data-testid="user-detail-page-content"
      data-user-id={props.userId as string}
      data-can-create={String(props.canCreate)}
      data-can-delete={String(props.canDelete)}
      data-can-manage-delegates={String(props.canManageDelegates)}
    />
  ),
}));

vi.mock("@/shared/presentation/components/AccessDeniedState", () => ({
  AccessDeniedState: ({ title, hint }: { title: string; hint: string }) => (
    <div data-testid="access-denied" data-title={title} data-hint={hint} />
  ),
}));

import { UserDetailPage } from "@/features/users/presentation/pages/UserDetailPage";

describe("UserDetailPage", () => {
  it("renders AccessDeniedState when user lacks user_permissions.read", () => {
    mockHasPermission.mockReturnValue(false);
    render(<UserDetailPage userId="user-1" />);
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("user-detail-page-content")).toBeNull();
  });

  it("shows translated title and hint in AccessDeniedState", () => {
    mockHasPermission.mockReturnValue(false);
    render(<UserDetailPage userId="user-1" />);
    const denied = screen.getByTestId("access-denied");
    expect(denied).toHaveAttribute("data-title", "t:accessDenied");
    expect(denied).toHaveAttribute("data-hint", "t:accessDeniedHint");
  });

  it("renders UserDetailPageContent when user has user_permissions.read", () => {
    mockHasPermission.mockImplementation(
      (key: string) => key === "user_permissions.read",
    );
    render(<UserDetailPage userId="user-1" />);
    expect(screen.getByTestId("user-detail-page-content")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).toBeNull();
  });

  it("passes userId to UserDetailPageContent", () => {
    mockHasPermission.mockReturnValue(true);
    render(<UserDetailPage userId="user-42" />);
    const content = screen.getByTestId("user-detail-page-content");
    expect(content).toHaveAttribute("data-user-id", "user-42");
  });

  it("passes canCreate based on user_permissions.create permission", () => {
    mockHasPermission.mockImplementation(
      (key: string) =>
        key === "user_permissions.read" || key === "user_permissions.create",
    );
    render(<UserDetailPage userId="user-1" />);
    const content = screen.getByTestId("user-detail-page-content");
    expect(content).toHaveAttribute("data-can-create", "true");
  });

  it("passes canDelete=false when user lacks user_permissions.delete", () => {
    mockHasPermission.mockImplementation(
      (key: string) => key === "user_permissions.read",
    );
    render(<UserDetailPage userId="user-1" />);
    const content = screen.getByTestId("user-detail-page-content");
    expect(content).toHaveAttribute("data-can-delete", "false");
  });

  it("passes canManageDelegates based on seller_admins.read permission", () => {
    mockHasPermission.mockImplementation(
      (key: string) =>
        key === "user_permissions.read" || key === "seller_admins.read",
    );
    render(<UserDetailPage userId="user-1" />);
    const content = screen.getByTestId("user-detail-page-content");
    expect(content).toHaveAttribute("data-can-manage-delegates", "true");
  });
});
