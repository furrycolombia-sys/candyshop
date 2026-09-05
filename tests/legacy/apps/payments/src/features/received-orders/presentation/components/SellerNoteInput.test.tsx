/* eslint-disable react/button-has-type */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={
        (props as Record<string, string>)["data-testid"] ?? undefined
      }
    >
      {children}
    </button>
  ),
}));

import { SellerNoteInput } from "./SellerNoteInput";

describe("SellerNoteInput", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders textarea and buttons", () => {
    render(
      <SellerNoteInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isPending={false}
      />,
    );

    expect(screen.getByTestId("seller-note-textarea")).toBeInTheDocument();
    expect(screen.getByTestId("seller-note-submit")).toBeInTheDocument();
    expect(screen.getByTestId("seller-note-cancel")).toBeInTheDocument();
  });

  it("shows error when submitting empty note", () => {
    render(
      <SellerNoteInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByTestId("seller-note-submit"));
    expect(screen.getByText("noteRequired")).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed note on valid input", () => {
    render(
      <SellerNoteInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isPending={false}
      />,
    );

    const textarea = screen.getByTestId("seller-note-textarea");
    fireEvent.change(textarea, { target: { value: "  My note  " } });
    fireEvent.click(screen.getByTestId("seller-note-submit"));

    expect(mockOnSubmit).toHaveBeenCalledWith("My note");
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(
      <SellerNoteInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByTestId("seller-note-cancel"));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("clears error when user types after validation failure", () => {
    render(
      <SellerNoteInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isPending={false}
      />,
    );

    // Submit empty -> error
    fireEvent.click(screen.getByTestId("seller-note-submit"));
    expect(screen.getByText("noteRequired")).toBeInTheDocument();

    // Type something -> error clears
    const textarea = screen.getByTestId("seller-note-textarea");
    fireEvent.change(textarea, { target: { value: "a" } });
    expect(screen.queryByText("noteRequired")).not.toBeInTheDocument();
  });

  it("disables inputs when isPending", () => {
    render(
      <SellerNoteInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isPending={true}
      />,
    );

    expect(screen.getByTestId("seller-note-textarea")).toBeDisabled();
    expect(screen.getByTestId("seller-note-submit")).toBeDisabled();
    expect(screen.getByTestId("seller-note-cancel")).toBeDisabled();
  });

  it("shows submitting text when pending", () => {
    render(
      <SellerNoteInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isPending={true}
      />,
    );

    expect(screen.getByText("submitting")).toBeInTheDocument();
  });

  it("uses custom placeholder when provided", () => {
    render(
      <SellerNoteInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isPending={false}
        placeholder="Custom placeholder"
      />,
    );

    const textarea = screen.getByTestId("seller-note-textarea");
    expect(textarea).toHaveAttribute("placeholder", "Custom placeholder");
  });
});
