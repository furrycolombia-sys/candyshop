import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ErrorProvider, useErrorContext } from "./ErrorContext";

vi.mock("shared/providers", () => ({
  ErrorProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-provider">{children}</div>
  ),
  useErrorContext: () => ({ error: null, setError: vi.fn() }),
}));

function TestChild() {
  const ctx = useErrorContext();
  return <div data-testid="error-ctx">{ctx ? "has-ctx" : "no-ctx"}</div>;
}

describe("ErrorContext re-export", () => {
  it("re-exports ErrorProvider", () => {
    render(
      <ErrorProvider>
        <div>child</div>
      </ErrorProvider>,
    );
    expect(screen.getByTestId("error-provider")).toBeInTheDocument();
  });

  it("re-exports useErrorContext", () => {
    render(<TestChild />);
    expect(screen.getByTestId("error-ctx")).toHaveTextContent("has-ctx");
  });
});
