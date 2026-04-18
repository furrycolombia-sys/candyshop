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
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
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

vi.mock("./SellerNoteInput", () => ({
  SellerNoteInput: ({
    onSubmit,
    onCancel,
  }: {
    onSubmit: (note: string) => void;
    onCancel: () => void;
    isPending: boolean;
    placeholder?: string;
  }) => (
    <div data-testid="seller-note-input">
      <button
        data-testid="mock-note-submit"
        onClick={() => onSubmit("test note")}
      >
        Submit
      </button>
      <button type="button" data-testid="mock-note-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

import { ActionButtons } from "./ActionButtons";

describe("ActionButtons", () => {
  const mockOnAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders approve and reject for pending_verification", () => {
    render(
      <ActionButtons
        orderId="o1"
        status="pending_verification"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    expect(screen.getByTestId("order-approve-o1")).toBeInTheDocument();
    expect(screen.getByTestId("order-reject-o1")).toBeInTheDocument();
    expect(screen.getByTestId("order-evidence-o1")).toBeInTheDocument();
  });

  it("renders approve and reject for evidence_requested", () => {
    render(
      <ActionButtons
        orderId="o1"
        status="evidence_requested"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    expect(screen.getByTestId("order-approve-o1")).toBeInTheDocument();
    expect(screen.getByTestId("order-reject-o1")).toBeInTheDocument();
    // No evidence request button for evidence_requested status
    expect(screen.queryByTestId("order-evidence-o1")).not.toBeInTheDocument();
  });

  it("renders nothing for approved status", () => {
    const { container } = render(
      <ActionButtons
        orderId="o1"
        status="approved"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for rejected status", () => {
    const { container } = render(
      <ActionButtons
        orderId="o1"
        status="rejected"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("shows confirmation panel when approve is clicked", () => {
    render(
      <ActionButtons
        orderId="o1"
        status="pending_verification"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByTestId("order-approve-o1"));
    expect(screen.getByTestId("confirm-action-panel")).toBeInTheDocument();
    // onAction should NOT be called yet (no checkbox checked)
    expect(mockOnAction).not.toHaveBeenCalled();
  });

  it("calls onAction with approved after checkbox and confirm", () => {
    render(
      <ActionButtons
        orderId="o1"
        status="pending_verification"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByTestId("order-approve-o1"));
    fireEvent.click(screen.getByTestId("confirm-checkbox"));
    fireEvent.click(screen.getByTestId("confirm-action-submit"));
    expect(mockOnAction).toHaveBeenCalledWith("approved");
  });

  it("cancels approval and returns to buttons when cancel is clicked", () => {
    render(
      <ActionButtons
        orderId="o1"
        status="pending_verification"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByTestId("order-approve-o1"));
    expect(screen.getByTestId("confirm-action-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-action-cancel"));
    expect(screen.getByTestId("order-approve-o1")).toBeInTheDocument();
    expect(mockOnAction).not.toHaveBeenCalled();
  });

  it("shows note input when reject is clicked", () => {
    render(
      <ActionButtons
        orderId="o1"
        status="pending_verification"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByTestId("order-reject-o1"));
    expect(screen.getByTestId("seller-note-input")).toBeInTheDocument();
  });

  it("submits rejection with note", () => {
    render(
      <ActionButtons
        orderId="o1"
        status="pending_verification"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    // Click reject to show note input
    fireEvent.click(screen.getByTestId("order-reject-o1"));

    // Submit the note
    fireEvent.click(screen.getByTestId("mock-note-submit"));
    expect(mockOnAction).toHaveBeenCalledWith("rejected", "test note");
  });

  it("shows note input when evidence request is clicked", () => {
    render(
      <ActionButtons
        orderId="o1"
        status="pending_verification"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByTestId("order-evidence-o1"));
    expect(screen.getByTestId("seller-note-input")).toBeInTheDocument();
  });

  it("submits evidence request with note", () => {
    render(
      <ActionButtons
        orderId="o1"
        status="pending_verification"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    fireEvent.click(screen.getByTestId("order-evidence-o1"));
    fireEvent.click(screen.getByTestId("mock-note-submit"));
    expect(mockOnAction).toHaveBeenCalledWith(
      "evidence_requested",
      "test note",
    );
  });

  it("cancels note mode when cancel is clicked", () => {
    render(
      <ActionButtons
        orderId="o1"
        status="pending_verification"
        onAction={mockOnAction}
        isPending={false}
      />,
    );

    // Enter note mode
    fireEvent.click(screen.getByTestId("order-reject-o1"));
    expect(screen.getByTestId("seller-note-input")).toBeInTheDocument();

    // Cancel
    fireEvent.click(screen.getByTestId("mock-note-cancel"));
    expect(screen.queryByTestId("seller-note-input")).not.toBeInTheDocument();
  });
});
