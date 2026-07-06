import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockHasPermission = vi.fn();

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({ hasPermission: mockHasPermission }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({ tid: (id: string) => ({ "data-testid": id }) }));

vi.mock("@/features/reports/application/hooks/useDelegatedReports", () => ({
  useDelegatedReports: () => ({
    orders: [{ id: "o1", items: [], currency: "USD" }],
    total: 1,
    isLoading: false,
    isError: false,
    filters: {},
    setFilters: vi.fn(),
  }),
}));

vi.mock(
  "@/features/reports/presentation/components/SellerReportFiltersBar",
  () => ({
    SellerReportFiltersBar: () => <div data-testid="filters-bar" />,
  }),
);

vi.mock("@/features/reports/presentation/components/SellerReportTable", () => ({
  SellerReportTable: () => <div data-testid="report-table" />,
}));

vi.mock("@/shared/presentation/components/AccessDeniedState", () => ({
  AccessDeniedState: () => <div data-testid="access-denied" />,
}));

import { DelegatedReportsPage } from "./DelegatedReportsPage";

describe("DelegatedReportsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows access denied without reports.read", () => {
    mockHasPermission.mockReturnValue(false);
    render(<DelegatedReportsPage />);
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
  });

  it("renders the report and hides export without reports.export", () => {
    mockHasPermission.mockImplementation((keys: string[]) =>
      keys.includes("reports.read"),
    );
    render(<DelegatedReportsPage />);
    expect(screen.getByTestId("report-table")).toBeInTheDocument();
    expect(
      screen.queryByTestId("delegated-reports-export-button"),
    ).not.toBeInTheDocument();
  });

  it("shows export button with reports.export", () => {
    mockHasPermission.mockReturnValue(true);
    render(<DelegatedReportsPage />);
    expect(
      screen.getByTestId("delegated-reports-export-button"),
    ).toBeInTheDocument();
  });
});
