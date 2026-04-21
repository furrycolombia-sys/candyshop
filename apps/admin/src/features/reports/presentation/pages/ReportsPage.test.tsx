import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (values) return `${key}:${JSON.stringify(values)}`;
    return key;
  },
}));

vi.mock("@/shared/infrastructure/config/tid", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

const mockSetFilters = vi.fn();

vi.mock("@/features/reports/application/hooks/useReportOrders", () => ({
  useReportOrders: vi.fn(() => ({
    orders: [],
    total: 0,
    isLoading: false,
    isError: false,
    filters: {
      dateFrom: null,
      dateTo: null,
      status: null,
      sellerId: null,
      buyerId: null,
      productId: null,
      currency: null,
      amountMin: null,
      amountMax: null,
    },
    setFilters: mockSetFilters,
  })),
}));

vi.mock("@/features/reports/presentation/components/ReportFiltersBar", () => ({
  ReportFiltersBar: ({
    onFiltersChange,
  }: {
    onFiltersChange: (v: unknown) => void;
  }) => (
    <div data-testid="filters-bar-mock">
      <button
        type="button"
        data-testid="trigger-filter-change"
        onClick={() => onFiltersChange({ status: "approved" })}
      >
        Filter
      </button>
    </div>
  ),
}));

vi.mock("@/features/reports/presentation/components/ReportTable", () => ({
  ReportTable: () => <div data-testid="report-table-mock">Table</div>,
}));

import { ReportsPage } from "./ReportsPage";

import { useReportOrders } from "@/features/reports/application/hooks/useReportOrders";

describe("ReportsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the page root with test id", () => {
    render(<ReportsPage />);
    expect(screen.getByTestId("reports-page")).toBeInTheDocument();
  });

  it("renders page title and subtitle", () => {
    render(<ReportsPage />);
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("subtitle")).toBeInTheDocument();
  });

  it("renders export button", () => {
    render(<ReportsPage />);
    expect(screen.getByTestId("reports-export-button")).toBeInTheDocument();
  });

  it("export button is disabled when there are no orders", () => {
    render(<ReportsPage />);
    expect(screen.getByTestId("reports-export-button")).toBeDisabled();
  });

  it("export button is enabled when orders exist", () => {
    vi.mocked(useReportOrders).mockReturnValueOnce({
      orders: [
        {
          id: "o1",
          created_at: "2026-01-01T00:00:00Z",
          payment_status: "approved",
          total: 100,
          currency: "USD",
          transfer_number: null,
          receipt_url: null,
          buyer_id: "b1",
          buyer_email: "b@example.com",
          buyer_display_name: null,
          seller_id: null,
          seller_email: null,
          seller_display_name: null,
          items: [],
        },
      ],
      total: 1,
      isLoading: false,
      isError: false,
      filters: {
        dateFrom: null,
        dateTo: null,
        status: null,
        sellerId: null,
        buyerId: null,
        productId: null,
        currency: null,
        amountMin: null,
        amountMax: null,
      },
      setFilters: mockSetFilters,
    });
    render(<ReportsPage />);
    expect(screen.getByTestId("reports-export-button")).not.toBeDisabled();
  });

  it("renders filters bar", () => {
    render(<ReportsPage />);
    expect(screen.getByTestId("filters-bar-mock")).toBeInTheDocument();
  });

  it("renders total orders count when not loading", () => {
    vi.mocked(useReportOrders).mockReturnValueOnce({
      orders: [],
      total: 42,
      isLoading: false,
      isError: false,
      filters: {
        dateFrom: null,
        dateTo: null,
        status: null,
        sellerId: null,
        buyerId: null,
        productId: null,
        currency: null,
        amountMin: null,
        amountMax: null,
      },
      setFilters: mockSetFilters,
    });
    render(<ReportsPage />);
    expect(screen.getByTestId("reports-total-count")).toBeInTheDocument();
  });

  it("does not render total count when loading", () => {
    vi.mocked(useReportOrders).mockReturnValueOnce({
      orders: [],
      total: 0,
      isLoading: true,
      isError: false,
      filters: {
        dateFrom: null,
        dateTo: null,
        status: null,
        sellerId: null,
        buyerId: null,
        productId: null,
        currency: null,
        amountMin: null,
        amountMax: null,
      },
      setFilters: mockSetFilters,
    });
    render(<ReportsPage />);
    expect(screen.queryByTestId("reports-total-count")).not.toBeInTheDocument();
  });

  it("shows loading text when loading", () => {
    vi.mocked(useReportOrders).mockReturnValueOnce({
      orders: [],
      total: 0,
      isLoading: true,
      isError: false,
      filters: {
        dateFrom: null,
        dateTo: null,
        status: null,
        sellerId: null,
        buyerId: null,
        productId: null,
        currency: null,
        amountMin: null,
        amountMax: null,
      },
      setFilters: mockSetFilters,
    });
    render(<ReportsPage />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows error text when error", () => {
    vi.mocked(useReportOrders).mockReturnValueOnce({
      orders: [],
      total: 0,
      isLoading: false,
      isError: true,
      filters: {
        dateFrom: null,
        dateTo: null,
        status: null,
        sellerId: null,
        buyerId: null,
        productId: null,
        currency: null,
        amountMin: null,
        amountMax: null,
      },
      setFilters: mockSetFilters,
    });
    render(<ReportsPage />);
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("renders table when not loading and no error", () => {
    render(<ReportsPage />);
    expect(screen.getByTestId("report-table-mock")).toBeInTheDocument();
  });

  it("calls the export endpoint when export button is clicked", async () => {
    const mockBlob = new Blob(["xlsx-data"], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal("fetch", mockFetch);
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    globalThis.URL.revokeObjectURL = vi.fn();

    vi.mocked(useReportOrders).mockReturnValue({
      orders: [
        {
          id: "o1",
          created_at: "2026-01-01T00:00:00Z",
          payment_status: "approved",
          total: 100,
          currency: "USD",
          transfer_number: null,
          receipt_url: null,
          buyer_id: "b1",
          buyer_email: "b@example.com",
          buyer_display_name: null,
          seller_id: null,
          seller_email: null,
          seller_display_name: null,
          items: [],
        },
      ],
      total: 1,
      isLoading: false,
      isError: false,
      filters: {
        dateFrom: null,
        dateTo: null,
        status: null,
        sellerId: null,
        buyerId: null,
        productId: null,
        currency: null,
        amountMin: null,
        amountMax: null,
      },
      setFilters: mockSetFilters,
    });
    render(<ReportsPage />);
    fireEvent.click(screen.getByTestId("reports-export-button"));
    await screen.findByTestId("reports-export-button");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/reports/export"),
    );
    vi.unstubAllGlobals();
  });

  it("calls setFilters when filters bar triggers change", () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByTestId("trigger-filter-change"));
    expect(mockSetFilters).toHaveBeenCalled();
  });
});
