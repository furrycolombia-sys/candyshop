import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { FlyToCartProvider, useFlyToCartContext } from "./FlyToCartContext";

vi.mock("./useFlyToCart", () => ({
  useFlyToCart: () => ({
    cartRef: { current: null },
    setCartTarget: vi.fn(),
    fire: vi.fn(),
  }),
}));

function TestConsumer() {
  const ctx = useFlyToCartContext();
  return (
    <div data-testid="ctx-value">{ctx ? "has-context" : "no-context"}</div>
  );
}

describe("FlyToCartContext", () => {
  it("provides null outside provider", () => {
    render(<TestConsumer />);
    expect(screen.getByTestId("ctx-value")).toHaveTextContent("no-context");
  });

  it("provides context value inside provider", () => {
    render(
      <FlyToCartProvider>
        <TestConsumer />
      </FlyToCartProvider>,
    );
    expect(screen.getByTestId("ctx-value")).toHaveTextContent("has-context");
  });
});
