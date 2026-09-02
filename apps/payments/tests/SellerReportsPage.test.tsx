import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  },
}));

vi.mock("shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shared")>();
  return { ...actual, tid: (id: string) => ({ "data-testid": id }) };
});

const mockSetFilters = vi.fn();
const mockUseSellerReports = vi.fn();

vi.mock("@/features/reports/application/hooks/useSellerReports", () => ({
  useSellerReports: () => mockUseSellerReports(),
}));

vi.mock(
  "@/features/reports/presentation/components/SellerReportFiltersBar",
  () => ({
    SellerReportFiltersBar: () => <div data-testid="filters-bar" />,
  }),
);

vi.mock("@/features/reports/presentation/components/SellerReportTable", () => ({
  SellerReportTable: ({ orders }: { orders: unknown[] }) => (
    <div data-testid="report-table">{orders.length} orders</div>
  ),
}));

const mockExportSellerOrdersToExcel = vi.fn();
const mockDownloadExcel = vi.fn();
const mockBuildExportFilename = vi.fn();

vi.mock(
  "@/features/reports/application/utils/exportSellerOrdersToExcel",
  () => ({
    exportSellerOrdersToExcel: (...args: unknown[]) =>
      mockExportSellerOrdersToExcel(...args),
    downloadExcel: (...args: unknown[]) => mockDownloadExcel(...args),
    buildExportFilename: (...args: unknown[]) =>
      mockBuildExportFilename(...args),
  }),
);

vi.mock("lucide-react", () => ({
  Download: () => <svg data-testid="download-icon" />,
}));

import { SellerReportsPage } from "@/features/reports/presentation/pages/SellerReportsPage";

describe("SellerReportsPage", () => {
  beforeEach(() => {
    mockSetFilters.mockClear();
    mockExportSellerOrdersToExcel.mockClear();
    mockDownloadExcel.mockClear();
    mockBuildExportFilename.mockClear();
    mockExportSellerOrdersToExcel.mockReturnValue("excel-content");
    mockBuildExportFilename.mockReturnValue("report.xlsx");
  });

  it("shows loading state", () => {
    mockUseSellerReports.mockReturnValue({
      orders: [],
      total: 0,
      isLoading: true,
      isError: false,
      filters: {},
      setFilters: mockSetFilters,
    });
    render(<SellerReportsPage />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockUseSellerReports.mockReturnValue({
      orders: [],
      total: 0,
      isLoading: false,
      isError: true,
      filters: {},
      setFilters: mockSetFilters,
    });
    render(<SellerReportsPage />);
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("renders filters bar and table when loaded", () => {
    mockUseSellerReports.mockReturnValue({
      orders: [],
      total: 0,
      isLoading: false,
      isError: false,
      filters: {},
      setFilters: mockSetFilters,
    });
    render(<SellerReportsPage />);
    expect(screen.getByTestId("filters-bar")).toBeInTheDocument();
    expect(screen.getByTestId("report-table")).toBeInTheDocument();
  });

  it("shows total orders count", () => {
    mockUseSellerReports.mockReturnValue({
      orders: [{}],
      total: 1,
      isLoading: false,
      isError: false,
      filters: {},
      setFilters: mockSetFilters,
    });
    render(<SellerReportsPage />);
    expect(
      screen.getByTestId("seller-reports-total-count"),
    ).toBeInTheDocument();
  });

  it("export button is disabled when there are no orders", () => {
    mockUseSellerReports.mockReturnValue({
      orders: [],
      total: 0,
      isLoading: false,
      isError: false,
      filters: {},
      setFilters: mockSetFilters,
    });
    render(<SellerReportsPage />);
    expect(screen.getByTestId("seller-reports-export-button")).toBeDisabled();
  });

  it("export button is enabled when orders exist", () => {
    mockUseSellerReports.mockReturnValue({
      orders: [{ id: "1", currency: "USD" }],
      total: 1,
      isLoading: false,
      isError: false,
      filters: {},
      setFilters: mockSetFilters,
    });
    render(<SellerReportsPage />);
    expect(
      screen.getByTestId("seller-reports-export-button"),
    ).not.toBeDisabled();
  });

  it("clicking export calls exportSellerOrdersToExcel and downloadExcel", async () => {
    const orders = [{ id: "1", currency: "USD" }];
    const filters = { dateFrom: null };
    mockUseSellerReports.mockReturnValue({
      orders,
      total: 1,
      isLoading: false,
      isError: false,
      filters,
      setFilters: mockSetFilters,
    });
    render(<SellerReportsPage />);
    fireEvent.click(screen.getByTestId("seller-reports-export-button"));
    await waitFor(() => {
      expect(mockExportSellerOrdersToExcel).toHaveBeenCalledWith(
        orders,
        filters,
      );
      expect(mockDownloadExcel).toHaveBeenCalledWith(
        "excel-content",
        "report.xlsx",
      );
    });
  });
});
