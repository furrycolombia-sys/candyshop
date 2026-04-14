import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { InlineRemoveButton } from "./InlineRemoveButton";

describe("InlineRemoveButton", () => {
  it("renders with aria-label", () => {
    render(<InlineRemoveButton onClick={vi.fn()} ariaLabel="Remove item 1" />);
    expect(screen.getByTestId("inline-remove-btn")).toHaveAttribute(
      "aria-label",
      "Remove item 1",
    );
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<InlineRemoveButton onClick={onClick} ariaLabel="Remove" />);
    fireEvent.click(screen.getByTestId("inline-remove-btn"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is a button with type=button", () => {
    render(<InlineRemoveButton onClick={vi.fn()} ariaLabel="Remove" />);
    expect(screen.getByTestId("inline-remove-btn")).toHaveAttribute(
      "type",
      "button",
    );
  });
});
