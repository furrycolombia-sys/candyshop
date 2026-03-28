import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/features/audit/application/useAuditLog", () => ({
  useAuditLog: () => ({
    data: [
      {
        event_id: 1,
        action_type: "INSERT",
        table_name: "products",
        action_timestamp: "2025-01-15T10:00:00Z",
        user_display_name: "Admin",
        user_email: null,
        db_user: "postgres",
      },
    ],
  }),
}));

vi.mock("@/features/dashboard/presentation/components/ActivityRow", () => ({
  ActivityRow: (props: { table: string }) => (
    <div data-testid="activity-row">{props.table}</div>
  ),
}));

vi.mock("@/features/dashboard/presentation/components/StatusRow", () => ({
  StatusRow: (props: { label: string }) => (
    <div data-testid="status-row">{props.label}</div>
  ),
}));

vi.mock("@/shared/infrastructure/i18n", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
  it("renders the page with test id", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("admin-page")).toBeInTheDocument();
  });

  it("renders the overview title", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("admin-title")).toHaveTextContent("overview");
  });

  it("renders the welcome message", () => {
    render(<DashboardPage />);
    expect(screen.getByText("welcome")).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-totalEvents")).toBeInTheDocument();
    expect(screen.getByTestId("stat-tablesMonitored")).toBeInTheDocument();
    expect(screen.getByTestId("stat-activeUsers")).toBeInTheDocument();
    expect(screen.getByTestId("stat-uptime")).toBeInTheDocument();
  });

  it("renders recent activity section", () => {
    render(<DashboardPage />);
    expect(screen.getByText("recentActivity")).toBeInTheDocument();
  });

  it("renders activity rows from audit data", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("activity-row")).toBeInTheDocument();
    expect(screen.getByText("products")).toBeInTheDocument();
  });

  it("renders quick actions section with audit log link", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("quick-action-audit")).toBeInTheDocument();
  });

  it("renders system status rows", () => {
    render(<DashboardPage />);
    const statusRows = screen.getAllByTestId("status-row");
    expect(statusRows.length).toBe(4);
  });
});
