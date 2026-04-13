import { render, screen } from "@testing-library/react";
import { useCurrentUserPermissions } from "auth/client";
import { describe, expect, it, vi } from "vitest";

import { UsersPage } from "./UsersPage";

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: vi.fn(),
}));

vi.mock("@/features/users/presentation/pages/UsersPageContent", () => ({
  UsersPageContent: () => <div data-testid="users-content">Content</div>,
}));

vi.mock("@/shared/presentation/components/AccessDeniedState", () => ({
  AccessDeniedState: () => <div data-testid="access-denied">Denied</div>,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("UsersPage", () => {
  it("renders nothing while loading", () => {
    vi.mocked(useCurrentUserPermissions).mockReturnValue({
      isLoading: true,
      hasPermission: vi.fn(),
    } as unknown as ReturnType<typeof useCurrentUserPermissions>);

    const { container } = render(<UsersPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders access denied if no permission", () => {
    vi.mocked(useCurrentUserPermissions).mockReturnValue({
      isLoading: false,
      hasPermission: vi.fn().mockReturnValue(false),
    } as unknown as ReturnType<typeof useCurrentUserPermissions>);

    render(<UsersPage />);
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("users-content")).not.toBeInTheDocument();
  });

  it("renders content if user has permission", () => {
    vi.mocked(useCurrentUserPermissions).mockReturnValue({
      isLoading: false,
      hasPermission: vi
        .fn()
        .mockImplementation((p) => p === "user_permissions.read"),
    } as unknown as ReturnType<typeof useCurrentUserPermissions>);

    render(<UsersPage />);
    expect(screen.getByTestId("users-content")).toBeInTheDocument();
    expect(screen.queryByTestId("access-denied")).not.toBeInTheDocument();
  });
});
