import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { QueryProvider } from "./QueryProvider";

function TestConsumer() {
  const queryClient = useQueryClient();
  return (
    <div data-testid="consumer">
      {queryClient ? "QueryClient available" : "No QueryClient"}
    </div>
  );
}

describe("QueryProvider", () => {
  it("renders children", () => {
    render(
      <QueryProvider>
        <div data-testid="child">Hello</div>
      </QueryProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("provides a QueryClient to children", () => {
    render(
      <QueryProvider>
        <TestConsumer />
      </QueryProvider>,
    );
    expect(screen.getByText("QueryClient available")).toBeInTheDocument();
  });
});
