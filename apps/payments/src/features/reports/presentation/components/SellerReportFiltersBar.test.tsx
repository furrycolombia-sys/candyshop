import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shared")>();
  return { ...actual, tid: (id: string) => ({ "data-testid": id }) };
});

import { SellerReportFiltersBar } from "./SellerReportFiltersBar";

import type { SellerReportFilters } from "@/features/reports/domain/types";

const emptyFilters: SellerReportFilters = {
  dateFrom: null,
  dateTo: null,
  status: null,
  buyerId: null,
  currency: null,
  amountMin: null,
  amountMax: null,
};

describe("SellerReportFiltersBar", () => {
  const onFiltersChange = vi.fn();

  beforeEach(() => {
    onFiltersChange.mockClear();
  });

  it("renders filter inputs", () => {
    render(
      <SellerReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    expect(
      screen.getByTestId("seller-reports-filters-bar"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("seller-reports-filter-date-from"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("seller-reports-filter-date-to"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("seller-reports-filter-status"),
    ).toBeInTheDocument();
  });

  it("does not show currency filter when currencies list is empty", () => {
    render(
      <SellerReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    expect(
      screen.queryByTestId("seller-reports-filter-currency"),
    ).not.toBeInTheDocument();
  });

  it("shows currency filter when currencies are provided", () => {
    render(
      <SellerReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={["USD", "EUR"]}
      />,
    );
    expect(
      screen.getByTestId("seller-reports-filter-currency"),
    ).toBeInTheDocument();
  });

  it("does not show clear button when no filters are active", () => {
    render(
      <SellerReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    expect(
      screen.queryByTestId("seller-reports-filter-clear"),
    ).not.toBeInTheDocument();
  });

  it("shows clear button when filters are active", () => {
    render(
      <SellerReportFiltersBar
        filters={{ ...emptyFilters, status: "approved" }}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    expect(
      screen.getByTestId("seller-reports-filter-clear"),
    ).toBeInTheDocument();
  });

  it("calls onFiltersChange when clear is clicked", () => {
    render(
      <SellerReportFiltersBar
        filters={{ ...emptyFilters, status: "approved" }}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.click(screen.getByTestId("seller-reports-filter-clear"));
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: null }),
    );
  });

  it("calls onFiltersChange when date-from changes", () => {
    render(
      <SellerReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-date-from"), {
      target: { value: "2024-01-01" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ dateFrom: "2024-01-01" });
  });
});
