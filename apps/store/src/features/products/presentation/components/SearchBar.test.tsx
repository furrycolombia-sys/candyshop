import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SearchBar } from "@/features/products/presentation/components/SearchBar";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetQuery = vi.fn();
let mockQuery = "";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("nuqs", () => ({
  useQueryState: () => [mockQuery, mockSetQuery],
  parseAsString: {
    withDefault: (val: string) => ({ defaultValue: val }),
  },
}));

vi.mock("@/features/products/domain/searchParams", () => ({
  catalogSearchParams: {
    q: { defaultValue: "" },
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockQuery = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the search input", () => {
    render(<SearchBar />);
    expect(screen.getByTestId("search-bar-input")).toBeInTheDocument();
  });

  it("renders with the search container", () => {
    render(<SearchBar />);
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
  });

  it("has an aria-label on the input", () => {
    render(<SearchBar />);
    expect(screen.getByTestId("search-bar-input")).toHaveAttribute(
      "aria-label",
      "search",
    );
  });

  it("updates local value on input change", () => {
    render(<SearchBar />);
    const input = screen.getByTestId("search-bar-input");

    fireEvent.change(input, { target: { value: "test" } });
    expect(input).toHaveValue("test");
  });

  it("debounces the query state update", () => {
    render(<SearchBar />);
    const input = screen.getByTestId("search-bar-input");

    fireEvent.change(input, { target: { value: "hello" } });
    // Not called yet (debounced)
    expect(mockSetQuery).not.toHaveBeenCalled();

    // Fast-forward past debounce
    vi.advanceTimersByTime(300);
    expect(mockSetQuery).toHaveBeenCalledWith("hello", expect.any(Object));
  });

  it("sets query to null for empty string after typing", () => {
    render(<SearchBar />);
    const input = screen.getByTestId("search-bar-input");

    // First type something, then clear it
    fireEvent.change(input, { target: { value: "test" } });
    vi.advanceTimersByTime(300);
    vi.clearAllMocks();

    fireEvent.change(input, { target: { value: "" } });
    vi.advanceTimersByTime(300);

    expect(mockSetQuery).toHaveBeenCalledWith(null, expect.any(Object));
  });
});
