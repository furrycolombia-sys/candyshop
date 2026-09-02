import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockGrantedKeys = ["products.read"];
const mockIsAuthenticated = true;

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({
    grantedKeys: mockGrantedKeys,
    isAuthenticated: mockIsAuthenticated,
    hasPermission: (key: string) => mockGrantedKeys.includes(key),
  }),
}));

const mockAppNavigation = vi.fn();
vi.mock("@monorepo/app-components", () => ({
  AppNavigation: (props: Record<string, unknown>) => {
    mockAppNavigation(props);
    return <div data-testid="app-navigation" />;
  },
}));

import { AppTopNavigation } from "@/shared/presentation/components/AppTopNavigation";

const defaultProps = {
  currentApp: "admin" as const,
  urls: { admin: "http://admin.test", store: "http://store.test" } as Record<
    string,
    string
  >,
  locales: ["en", "es"] as const,
  userEmail: "user@example.com",
};

describe("AppTopNavigation", () => {
  it("renders AppNavigation", () => {
    render(<AppTopNavigation {...defaultProps} />);
    expect(screen.getByTestId("app-navigation")).toBeInTheDocument();
  });

  it("passes permissionState with grantedKeys and isAuthenticated from hook", () => {
    render(<AppTopNavigation {...defaultProps} />);
    const call = mockAppNavigation.mock.calls[0]![0] as {
      permissionState: { grantedKeys: string[]; isAuthenticated: boolean };
    };
    expect(call.permissionState.grantedKeys).toEqual(mockGrantedKeys);
    expect(call.permissionState.isAuthenticated).toBe(true);
  });

  it("passes through all original props to AppNavigation", () => {
    render(<AppTopNavigation {...defaultProps} />);
    const call = mockAppNavigation.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.currentApp).toBe("admin");
    expect(call.userEmail).toBe("user@example.com");
  });
});
