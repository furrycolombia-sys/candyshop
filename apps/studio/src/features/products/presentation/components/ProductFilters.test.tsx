import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSetParams = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return {
    ...actual,
    useQueryStates: () => [{ type: "", category: "", q: "" }, mockSetParams],
  };
});

import { ProductFilters } from "./ProductFilters";

describe("ProductFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input", () => {
    render(<ProductFilters />);
    expect(screen.getByTestId("product-search")).toBeInTheDocument();
  });

  it("renders type filter pills", () => {
    render(<ProductFilters />);
    expect(screen.getByTestId("type-filter-all")).toBeInTheDocument();
  });

  it("renders category filter pills", () => {
    render(<ProductFilters />);
    expect(screen.getByTestId("category-filter-all")).toBeInTheDocument();
  });

  it("clicking type pill updates params", () => {
    render(<ProductFilters />);
    fireEvent.click(screen.getByTestId("type-filter-all"));
    expect(mockSetParams).toHaveBeenCalled();
  });

  it("clicking category pill updates params", () => {
    render(<ProductFilters />);
    fireEvent.click(screen.getByTestId("category-filter-all"));
    expect(mockSetParams).toHaveBeenCalled();
  });

  it("search input debounces and updates params", async () => {
    render(<ProductFilters />);
    const input = screen.getByTestId("product-search");
    fireEvent.change(input, { target: { value: "test" } });

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(mockSetParams).toHaveBeenCalled();
  });
});
