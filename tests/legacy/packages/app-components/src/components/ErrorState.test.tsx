import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `translated:${key}`,
}));

import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("renders without crashing", () => {
    render(<ErrorState message="Something went wrong" />);
    const el = screen.getByTestId("error-state");
    expect(el).toBeInTheDocument();
  });

  it("displays the error message", () => {
    render(<ErrorState message="Network error" />);
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    const retryButton = screen.getByRole("button");
    expect(retryButton).toBeInTheDocument();
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("displays custom retry label", () => {
    render(
      <ErrorState message="Error" onRetry={() => {}} retryLabel="Try Again" />,
    );
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("displays translated retry label when no custom label", () => {
    render(<ErrorState message="Error" onRetry={() => {}} />);
    expect(screen.getByText("translated:retry")).toBeInTheDocument();
  });

  it("applies custom height class", () => {
    render(<ErrorState message="Error" height="h-32" />);
    const el = screen.getByTestId("error-state");
    expect(el.className).toContain("h-32");
  });
});
