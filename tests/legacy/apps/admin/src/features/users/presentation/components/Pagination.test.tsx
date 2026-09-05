import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Pagination } from "./Pagination";

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (!params) return key;
    // Interpolate values into the key string so tests can verify counts
    const parts = Object.entries(params)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
    return `${key}(${parts})`;
  },
}));

describe("Pagination", () => {
  const defaultProps = {
    page: 2,
    totalPages: 5,
    from: 11,
    to: 20,
    total: 50,
    onPageChange: vi.fn(),
  };

  it("renders the pagination container", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTestId("users-pagination")).toBeInTheDocument();
  });

  it("renders prev and next buttons", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTestId("pagination-prev")).toBeInTheDocument();
    expect(screen.getByTestId("pagination-next")).toBeInTheDocument();
  });

  it("prev button is disabled on the first page", () => {
    render(<Pagination {...defaultProps} page={1} />);
    expect(screen.getByTestId("pagination-prev")).toBeDisabled();
  });

  it("next button is disabled on the last page", () => {
    render(<Pagination {...defaultProps} page={5} />);
    expect(screen.getByTestId("pagination-next")).toBeDisabled();
  });

  it("prev and next are both enabled on a middle page", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTestId("pagination-prev")).not.toBeDisabled();
    expect(screen.getByTestId("pagination-next")).not.toBeDisabled();
  });

  it("calls onPageChange with page - 1 when prev is clicked", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByTestId("pagination-prev"));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageChange with page + 1 when next is clicked", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByTestId("pagination-next"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with the correct page number when a page button is clicked", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByTestId("pagination-page-1"));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("renders page number buttons within the visible window", () => {
    render(<Pagination {...defaultProps} />);
    // page=2 of 5 → visible: 1, 2, 3, 5 (page±1 + first + last)
    expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
    expect(screen.getByTestId("pagination-page-2")).toBeInTheDocument();
    expect(screen.getByTestId("pagination-page-3")).toBeInTheDocument();
    expect(screen.getByTestId("pagination-page-5")).toBeInTheDocument();
    // page 4 is outside the window → not rendered
    expect(screen.queryByTestId("pagination-page-4")).not.toBeInTheDocument();
  });

  it("renders an ellipsis when there is a gap in the page window", () => {
    render(<Pagination {...defaultProps} />);
    // Gap between page 3 and page 5 → one ellipsis
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("renders showing range text", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText(/showing/i)).toBeInTheDocument();
  });
});
