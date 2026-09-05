import { act, render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) =>
    ns ? `${ns}.${key}` : key,
}));

const mockSetParams = vi.fn();
let mockQueryState = { type: "", category: "", q: "" };

vi.mock("nuqs", () => ({
  useQueryStates: () => [mockQueryState, mockSetParams],
  parseAsString: { withDefault: () => ({}) },
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
  cn: (...args: unknown[]) =>
    args.filter((a) => typeof a === "string" && a).join(" "),
}));

vi.mock("lucide-react", () => ({
  Search: () => <span data-testid="search-icon" />,
}));

vi.mock("@/features/products/domain/constants", () => ({
  PRODUCT_TYPES: [
    { value: "merch" },
    { value: "digital" },
    { value: "service" },
    { value: "ticket" },
  ],
  PRODUCT_CATEGORIES: [{ value: "commissions" }, { value: "artwork" }],
}));

vi.mock("@/features/products/domain/searchParams", () => ({
  catalogSearchParams: {},
}));

import { ProductFilters } from "./ProductFilters";

describe("ProductFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryState = { type: "", category: "", q: "" };
  });

  it("renders the filter container", () => {
    render(<ProductFilters />);
    expect(screen.getByTestId("product-filters")).toBeInTheDocument();
  });

  it("renders search bar input", () => {
    render(<ProductFilters />);
    expect(screen.getByTestId("search-bar-input")).toBeInTheDocument();
  });

  it("renders type filter pills including All", () => {
    render(<ProductFilters />);
    expect(screen.getByTestId("type-filter-all")).toBeInTheDocument();
    expect(screen.getByTestId("type-filter-merch")).toBeInTheDocument();
    expect(screen.getByTestId("type-filter-digital")).toBeInTheDocument();
    expect(screen.getByTestId("type-filter-service")).toBeInTheDocument();
    expect(screen.getByTestId("type-filter-ticket")).toBeInTheDocument();
  });

  it("renders category filter pills including All", () => {
    render(<ProductFilters />);
    expect(screen.getByTestId("category-filter-all")).toBeInTheDocument();
    expect(
      screen.getByTestId("category-filter-commissions"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("category-filter-artwork")).toBeInTheDocument();
  });

  it("type-filter-all is aria-pressed true when type is empty", () => {
    render(<ProductFilters />);
    expect(screen.getByTestId("type-filter-all")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("type-filter-merch")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("type-filter-merch is aria-pressed true when type is merch", () => {
    mockQueryState = { type: "merch", category: "", q: "" };
    render(<ProductFilters />);
    expect(screen.getByTestId("type-filter-merch")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("type-filter-all")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clicking type filter calls setParams with value", () => {
    render(<ProductFilters />);
    fireEvent.click(screen.getByTestId("type-filter-merch"));
    expect(mockSetParams).toHaveBeenCalledWith(
      { type: "merch" },
      { history: "push" },
    );
  });

  it("clicking all type filter calls setParams with null", () => {
    mockQueryState = { type: "merch", category: "", q: "" };
    render(<ProductFilters />);
    fireEvent.click(screen.getByTestId("type-filter-all"));
    expect(mockSetParams).toHaveBeenCalledWith(
      { type: null },
      { history: "push" },
    );
  });

  it("clicking category filter calls setParams with value", () => {
    render(<ProductFilters />);
    fireEvent.click(screen.getByTestId("category-filter-commissions"));
    expect(mockSetParams).toHaveBeenCalledWith(
      { category: "commissions" },
      { history: "replace" },
    );
  });

  it("clicking all category filter calls setParams with null", () => {
    mockQueryState = { type: "", category: "commissions", q: "" };
    render(<ProductFilters />);
    fireEvent.click(screen.getByTestId("category-filter-all"));
    expect(mockSetParams).toHaveBeenCalledWith(
      { category: null },
      { history: "replace" },
    );
  });

  it("search input initialises from q param", () => {
    mockQueryState = { type: "", category: "", q: "initial" };
    render(<ProductFilters />);
    const input = screen.getByTestId("search-bar-input") as HTMLInputElement;
    expect(input.value).toBe("initial");
  });

  it("typing in search input updates local state", () => {
    render(<ProductFilters />);
    const input = screen.getByTestId("search-bar-input");
    fireEvent.change(input, { target: { value: "art" } });
    expect((input as HTMLInputElement).value).toBe("art");
  });

  it("debounces search input and calls setParams after delay", async () => {
    vi.useFakeTimers();
    render(<ProductFilters />);
    const input = screen.getByTestId("search-bar-input");
    fireEvent.change(input, { target: { value: "art" } });
    expect(mockSetParams).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(mockSetParams).toHaveBeenCalledWith(
      { q: "art" },
      { history: "replace" },
    );
    vi.useRealTimers();
  });

  it("sets q to null when search input is cleared", async () => {
    vi.useFakeTimers();
    mockQueryState = { type: "", category: "", q: "prev" };
    render(<ProductFilters />);
    const input = screen.getByTestId("search-bar-input");
    fireEvent.change(input, { target: { value: "" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(mockSetParams).toHaveBeenCalledWith(
      { q: null },
      { history: "replace" },
    );
    vi.useRealTimers();
  });

  it("syncs external URL change back to input when q differs from local state", async () => {
    mockQueryState = { type: "", category: "", q: "" };
    const { rerender } = render(<ProductFilters />);
    const input = screen.getByTestId("search-bar-input");

    // User types something, changing local searchInput
    fireEvent.change(input, { target: { value: "local-typed" } });
    expect((input as HTMLInputElement).value).toBe("local-typed");

    // Simulate URL back/forward: q changes externally
    mockQueryState = { type: "", category: "", q: "back-nav-value" };
    rerender(<ProductFilters />);

    // Local input should be synced to the external q
    expect((input as HTMLInputElement).value).toBe("back-nav-value");
  });
});
