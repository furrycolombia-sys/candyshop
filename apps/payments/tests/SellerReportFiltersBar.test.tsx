import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shared")>();
  return { ...actual, tid: (id: string) => ({ "data-testid": id }) };
});

import { SellerReportFiltersBar } from "@/features/reports/presentation/components/SellerReportFiltersBar";

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

  it("calls onFiltersChange with null when date-from is cleared", () => {
    render(
      <SellerReportFiltersBar
        filters={{ ...emptyFilters, dateFrom: "2024-01-01" }}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-date-from"), {
      target: { value: "" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ dateFrom: null });
  });

  it("calls onFiltersChange when date-to changes", () => {
    render(
      <SellerReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-date-to"), {
      target: { value: "2024-12-31" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ dateTo: "2024-12-31" });
  });

  it("calls onFiltersChange with null when date-to is cleared", () => {
    render(
      <SellerReportFiltersBar
        filters={{ ...emptyFilters, dateTo: "2024-12-31" }}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-date-to"), {
      target: { value: "" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ dateTo: null });
  });

  it("calls onFiltersChange when status changes to a value", () => {
    render(
      <SellerReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-status"), {
      target: { value: "approved" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ status: "approved" });
  });

  it("calls onFiltersChange with null when status is reset to empty", () => {
    render(
      <SellerReportFiltersBar
        filters={{ ...emptyFilters, status: "approved" }}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-status"), {
      target: { value: "" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ status: null });
  });

  it("calls onFiltersChange when currency changes", () => {
    render(
      <SellerReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={["USD", "EUR"]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-currency"), {
      target: { value: "USD" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ currency: "USD" });
  });

  it("calls onFiltersChange with null when currency is reset to empty", () => {
    render(
      <SellerReportFiltersBar
        filters={{ ...emptyFilters, currency: "USD" }}
        onFiltersChange={onFiltersChange}
        currencies={["USD", "EUR"]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-currency"), {
      target: { value: "" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ currency: null });
  });

  it("calls onFiltersChange when amount-max changes", () => {
    render(
      <SellerReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-amount-max"), {
      target: { value: "5000" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ amountMax: 5000 });
  });

  it("calls onFiltersChange with null when amount-max is cleared", () => {
    render(
      <SellerReportFiltersBar
        filters={{ ...emptyFilters, amountMax: 5000 }}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-amount-max"), {
      target: { value: "" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ amountMax: null });
  });

  it("calls onFiltersChange when amount-min changes", () => {
    render(
      <SellerReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-amount-min"), {
      target: { value: "100" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ amountMin: 100 });
  });

  it("calls onFiltersChange with null when amount-min is cleared", () => {
    render(
      <SellerReportFiltersBar
        filters={{ ...emptyFilters, amountMin: 100 }}
        onFiltersChange={onFiltersChange}
        currencies={[]}
      />,
    );
    fireEvent.change(screen.getByTestId("seller-reports-filter-amount-min"), {
      target: { value: "" },
    });
    expect(onFiltersChange).toHaveBeenCalledWith({ amountMin: null });
  });

  // Every control here had a label sitting next to it and no htmlFor/id pair,
  // so a screen reader announced five unnamed fields. axe reported four
  // `label` violations and one `select-name`, critical each, the first time a
  // page-level check could see this page.
  it.each([
    "seller-reports-filter-date-from",
    "seller-reports-filter-date-to",
    "seller-reports-filter-status",
    "seller-reports-filter-amount-min",
    "seller-reports-filter-amount-max",
  ])("%s is labelled", (testId) => {
    render(
      <SellerReportFiltersBar
        filters={emptyFilters}
        onFiltersChange={onFiltersChange}
        currencies={["COP"]}
      />,
    );

    // Asserted through the accessible name rather than by finding the <label>
    // element: the name is what a screen reader announces, which is the thing
    // that was missing, and it holds however the association is made.
    const control = screen.getByTestId(testId);

    expect(
      control,
      `${testId} has no accessible name -- check its label's htmlFor`,
    ).toHaveAccessibleName();
  });
});
