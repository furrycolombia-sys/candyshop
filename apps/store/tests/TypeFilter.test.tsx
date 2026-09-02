import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PRODUCT_TYPES } from "@/features/products/domain/constants";
import { TypeFilter } from "@/features/products/presentation/components/TypeFilter";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetType = vi.fn();
let mockType = "";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("nuqs", () => ({
  useQueryState: () => [mockType, mockSetType],
  parseAsString: {
    withDefault: (val: string) => ({ defaultValue: val }),
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TypeFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockType = "";
  });

  it("renders the 'All' tab", () => {
    render(<TypeFilter />);

    expect(screen.getByTestId("type-filter-all")).toBeInTheDocument();
  });

  it("renders a tab for each product type", () => {
    render(<TypeFilter />);

    for (const { value } of PRODUCT_TYPES) {
      expect(screen.getByTestId(`type-filter-${value}`)).toBeInTheDocument();
    }
  });

  it("renders with tablist role and aria-label", () => {
    render(<TypeFilter />);

    expect(screen.getByTestId("type-filter")).toHaveAttribute(
      "role",
      "tablist",
    );
  });

  it("marks 'All' as selected when no type is active", () => {
    render(<TypeFilter />);

    expect(screen.getByTestId("type-filter-all")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("calls setType with null when 'All' tab is clicked", () => {
    render(<TypeFilter />);

    fireEvent.click(screen.getByTestId("type-filter-all"));

    expect(mockSetType).toHaveBeenCalledWith(null, { history: "push" });
  });

  it("calls setType with type value when a type tab is clicked", () => {
    render(<TypeFilter />);

    fireEvent.click(screen.getByTestId("type-filter-merch"));

    expect(mockSetType).toHaveBeenCalledWith("merch", { history: "push" });
  });

  it("marks the active type as selected", () => {
    mockType = "digital";
    render(<TypeFilter />);

    expect(screen.getByTestId("type-filter-digital")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("type-filter-all")).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("renders the correct number of tabs (all + types)", () => {
    render(<TypeFilter />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(1 + PRODUCT_TYPES.length);
  });

  it("all tabs have role='tab'", () => {
    render(<TypeFilter />);

    const tabs = screen.getAllByRole("tab");
    for (const tab of tabs) {
      expect(tab).toHaveAttribute("role", "tab");
    }
  });
});
