import { render, screen, fireEvent } from "@testing-library/react";
import { useCurrentUserPermissions } from "auth/client";
import { usePathname } from "next/navigation";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AdminSidebar } from "./AdminSidebar";

vi.mock("auth/client", () => ({
  matchesPermissions: vi.fn(
    (granted: string[], required: string[], mode: "all" | "any") => {
      if (required.length === 0) return true;
      if (mode === "any") return required.some((r) => granted.includes(r));
      return required.every((r) => granted.includes(r));
    },
  ),
  useCurrentUserPermissions: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}));

vi.mock("@/shared/infrastructure/i18n", () => ({
  Link: ({
    children,
    href,
    className,
    "aria-current": ariaCurrent,
    ...props
  }: import("react").ComponentProps<"a"> & { href: string }) => (
    <a href={href} className={className} aria-current={ariaCurrent} {...props}>
      {children}
    </a>
  ),
}));

describe("AdminSidebar", () => {
  const createPermissionsState = (
    grantedKeys: string[],
    overrides?: Partial<ReturnType<typeof useCurrentUserPermissions>>,
  ): ReturnType<typeof useCurrentUserPermissions> => ({
    grantedKeys,
    isLoading: false,
    isAuthenticated: true,
    hasPermission: (required, mode = "all") => {
      const requiredKeys = Array.isArray(required) ? required : [required];
      if (requiredKeys.length === 0) return true;
      if (mode === "any") {
        return requiredKeys.some((key) => grantedKeys.includes(key));
      }
      return requiredKeys.every((key) => grantedKeys.includes(key));
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with granted permissions", () => {
    vi.mocked(useCurrentUserPermissions).mockReturnValue(
      createPermissionsState([
        "admin.access",
        "templates.read",
        "audit.read",
        "user_permissions.read",
        "payment_settings.read",
      ]),
    );
    vi.mocked(usePathname).mockReturnValue("/en/templates");

    render(<AdminSidebar />);

    expect(screen.getByTestId("sidebar-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-templates")).toBeInTheDocument();

    // Check active state
    expect(screen.getByTestId("sidebar-templates")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("filters out items when permissions are denied", () => {
    vi.mocked(useCurrentUserPermissions).mockReturnValue(
      createPermissionsState([]),
    );
    render(<AdminSidebar />);

    expect(screen.queryByTestId("sidebar-dashboard")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-templates")).not.toBeInTheDocument();
  });

  it("handles loading state cleanly", () => {
    vi.mocked(useCurrentUserPermissions).mockReturnValue(
      createPermissionsState(["templates.read"], { isLoading: true }),
    );
    render(<AdminSidebar />);

    expect(screen.queryByTestId("sidebar-templates")).not.toBeInTheDocument();
  });

  it("allows collapsing and expanding the sidebar", () => {
    vi.mocked(useCurrentUserPermissions).mockReturnValue(
      createPermissionsState(["admin.access", "templates.read"]),
    );
    render(<AdminSidebar />);

    const toggleBtn = screen.getByTestId("sidebar-collapse-toggle");

    // Initially expanded
    expect(screen.getByText("operations")).toBeInTheDocument();

    // Click collapse
    fireEvent.click(toggleBtn);
    expect(screen.queryByText("operations")).not.toBeInTheDocument();

    // Click expand
    fireEvent.click(toggleBtn);
    expect(screen.getByText("operations")).toBeInTheDocument();
  });
});
