import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/shared/infrastructure/config/tid", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { ReportFiltersBar } from "./ReportFiltersBar";

import type { ReportFilters } from "@/features/reports/domain/types";

const emptyFilters: ReportFilters = {
  dateFrom: null,
  dateTo: null,
  status: null,
  sellerId: null,
  buyerId: null,
  productId: null,
  currency: null,
  amountMin: null,
  amountMax: null,
};

describe("ReportFiltersBar", () => {
  it("renders filter bar container", () => {
    render(
      <ReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={vi.fn()}
        currencies={[]}
      />,
    );
    expect(screen.getByTestId("reports-filters-bar")).toBeInTheDocument();
  });

  it("renders date from and date to inputs", () => {
    render(
      <ReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={vi.fn()}
        currencies={[]}
      />,
    );
    expect(screen.getByTestId("reports-filter-date-from")).toBeInTheDocument();
    expect(screen.getByTestId("reports-filter-date-to")).toBeInTheDocument();
  });

  it("renders status selector", () => {
    render(
      <ReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={vi.fn()}
        currencies={[]}
      />,
    );
    expect(screen.getByTestId("reports-filter-status")).toBeInTheDocument();
  });

  it("renders all order status options", () => {
    render(
      <ReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={vi.fn()}
        currencies={[]}
      />,
    );
    expect(screen.getByText("filters.allStatuses")).toBeInTheDocument();
    expect(screen.getByText("status.pending")).toBeInTheDocument();
    expect(screen.getByText("status.approved")).toBeInTheDocument();
    expect(screen.getByText("status.rejected")).toBeInTheDocument();
  });

  it("does not render currency selector when currencies is empty", () => {
    render(
      <ReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={vi.fn()}
        currencies={[]}
      />,
    );
    expect(
      screen.queryByTestId("reports-filter-currency"),
    ).not.toBeInTheDocument();
  });

  it("renders currency selector when currencies are provided", () => {
    render(
      <ReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={vi.fn()}
        currencies={["USD", "EUR"]}
      />,
    );
    expect(screen.getByTestId("reports-filter-currency")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("EUR")).toBeInTheDocument();
  });

  it("renders amount min and max inputs", () => {
    render(
      <ReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={vi.fn()}
        currencies={[]}
      />,
    );
    expect(screen.getByTestId("reports-filter-amount-min")).toBeInTheDocument();
    expect(screen.getByTestId("reports-filter-amount-max")).toBeInTheDocument();
  });

  it("does not show clear button when no active filters", () => {
    render(
      <ReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={vi.fn()}
        currencies={[]}
      />,
    );
    expect(
      screen.queryByTestId("reports-filter-clear"),
    ).not.toBeInTheDocument();
  });

  it("shows clear button when at least one filter is active", () => {
    render(
      <ReportFiltersBar
        filters={{ ...emptyFilters, status: "approved" }}
        onFiltersChange={vi.fn()}
        currencies={[]}
      />,
    );
    expect(screen.getByTestId("reports-filter-clear")).toBeInTheDocument();
  });

  it("calls onFiltersChange with null values when clear is clicked", () => {
    const onFiltersChange = vi.fn();
    render(
      <ReportFiltersBar
        filters={{ ...emptyFilters, status: "approved" }}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.click(screen.getByTestId("reports-filter-clear"));
    expect(onFiltersChange).toHaveBeenCalledWith({
      dateFrom: null,
      dateTo: null,
      status: null,
      sellerId: null,
      buyerId: null,
      productId: null,
      currency: null,
      amountMin: null,
      amountMax: null,
    });
  });

  it("calls onFiltersChange when date from changes", () => {
    const onFiltersChange = vi.fn();
    render(
      <ReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("reports-filter-date-from"), {
      target: { value: "2026-01-01" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ dateFrom: "2026-01-01" });
  });

  it("calls onFiltersChange with null when date from is cleared", () => {
    const onFiltersChange = vi.fn();
    render(
      <ReportFiltersBar
        filters={{ ...emptyFilters, dateFrom: "2026-01-01" }}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("reports-filter-date-from"), {
      target: { value: "" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ dateFrom: null });
  });

  it("calls onFiltersChange when status changes", () => {
    const onFiltersChange = vi.fn();
    render(
      <ReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("reports-filter-status"), {
      target: { value: "pending" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ status: "pending" });
  });

  it("calls onFiltersChange with null when status is cleared", () => {
    const onFiltersChange = vi.fn();
    render(
      <ReportFiltersBar
        filters={{ ...emptyFilters, status: "approved" }}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("reports-filter-status"), {
      target: { value: "" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ status: null });
  });

  it("calls onFiltersChange when amount min changes", () => {
    const onFiltersChange = vi.fn();
    render(
      <ReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("reports-filter-amount-min"), {
      target: { value: "100" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ amountMin: 100 });
  });

  it("shows active filter values as input values", () => {
    render(
      <ReportFiltersBar
        filters={{
          ...emptyFilters,
          dateFrom: "2026-01-01",
          dateTo: "2026-01-31",
        }}
        onFiltersChange={vi.fn()}
        currencies={[]}
      />,
    );
    expect(screen.getByTestId("reports-filter-date-from")).toHaveValue(
      "2026-01-01",
    );
    expect(screen.getByTestId("reports-filter-date-to")).toHaveValue(
      "2026-01-31",
    );
  });
});
