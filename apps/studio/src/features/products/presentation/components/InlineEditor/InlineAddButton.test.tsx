import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { InlineAddButton } from "./InlineAddButton";
import { InlineRemoveButton } from "./InlineRemoveButton";

describe("InlineAddButton", () => {
  it("renders with label", () => {
    render(<InlineAddButton label="Add Item" onClick={vi.fn()} />);
    expect(screen.getByText("Add Item")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<InlineAddButton label="Add" onClick={onClick} />);
    fireEvent.click(screen.getByTestId("inline-add-btn"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("InlineRemoveButton", () => {
  it("renders with aria label", () => {
    render(<InlineRemoveButton onClick={vi.fn()} ariaLabel="Remove item" />);
    expect(screen.getByLabelText("Remove item")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<InlineRemoveButton onClick={onClick} ariaLabel="Remove" />);
    fireEvent.click(screen.getByTestId("inline-remove-btn"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
