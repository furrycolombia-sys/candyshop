import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PRODUCT_CATEGORIES } from "@/features/products/domain/constants";
import { CategoryFilter } from "@/features/products/presentation/components/CategoryFilter";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetCategory = vi.fn();
let mockCategory = "";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("nuqs", () => ({
  useQueryState: () => [mockCategory, mockSetCategory],
  parseAsString: {
    withDefault: (val: string) => ({ defaultValue: val }),
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CategoryFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategory = "";
  });

  it("renders the 'All' button", () => {
    render(<CategoryFilter />);

    expect(screen.getByTestId("category-filter-all")).toBeInTheDocument();
  });

  it("renders a button for each product category", () => {
    render(<CategoryFilter />);

    for (const { value } of PRODUCT_CATEGORIES) {
      expect(
        screen.getByTestId(`category-filter-${value}`),
      ).toBeInTheDocument();
    }
  });

  it("renders with group role and aria-label", () => {
    render(<CategoryFilter />);

    expect(screen.getByTestId("category-filter")).toHaveAttribute(
      "role",
      "group",
    );
  });

  it("marks 'All' as pressed when no category is selected", () => {
    render(<CategoryFilter />);

    expect(screen.getByTestId("category-filter-all")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("calls setCategory with null when 'All' is clicked", () => {
    render(<CategoryFilter />);

    fireEvent.click(screen.getByTestId("category-filter-all"));

    expect(mockSetCategory).toHaveBeenCalledWith(null, { history: "replace" });
  });

  it("calls setCategory with category value when a category button is clicked", () => {
    render(<CategoryFilter />);

    fireEvent.click(screen.getByTestId("category-filter-fursuits"));

    expect(mockSetCategory).toHaveBeenCalledWith("fursuits", {
      history: "replace",
    });
  });

  it("marks the active category as pressed", () => {
    mockCategory = "art";
    render(<CategoryFilter />);

    expect(screen.getByTestId("category-filter-art")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("category-filter-all")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("renders the correct number of buttons (all + categories)", () => {
    render(<CategoryFilter />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1 + PRODUCT_CATEGORIES.length);
  });
});
