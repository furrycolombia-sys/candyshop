import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { MutationErrorBanner } from "./MutationErrorBanner";

describe("MutationErrorBanner", () => {
  it("renders the error message", () => {
    render(<MutationErrorBanner message="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("has role=alert for accessibility", () => {
    render(<MutationErrorBanner message="Error" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("has the correct test id", () => {
    render(<MutationErrorBanner message="Error" />);
    expect(screen.getByTestId("mutation-error-banner")).toBeInTheDocument();
  });

  it("displays different error messages", () => {
    const { rerender } = render(<MutationErrorBanner message="First error" />);
    expect(screen.getByText("First error")).toBeInTheDocument();

    rerender(<MutationErrorBanner message="Second error" />);
    expect(screen.getByText("Second error")).toBeInTheDocument();
    expect(screen.queryByText("First error")).not.toBeInTheDocument();
  });
});
