import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <svg data-testid="alert-triangle" />,
}));

import { ConfirmActionPanel } from "@/features/received-orders/presentation/components/ConfirmActionPanel";

const defaultProps = {
  warning: "This action cannot be undone.",
  checkboxLabel: "I understand",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  variant: "approve" as const,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  isPending: false,
};

describe("ConfirmActionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders warning text, checkbox, and buttons", () => {
    render(<ConfirmActionPanel {...defaultProps} />);

    expect(screen.getByTestId("confirm-action-panel")).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("confirm-checkbox")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-action-submit")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-action-cancel")).toBeInTheDocument();
  });

  it("confirm button is disabled when checkbox is unchecked", () => {
    render(<ConfirmActionPanel {...defaultProps} />);

    expect(screen.getByTestId("confirm-action-submit")).toBeDisabled();
  });

  it("confirm button is enabled after checking the checkbox", () => {
    render(<ConfirmActionPanel {...defaultProps} />);

    fireEvent.click(screen.getByTestId("confirm-checkbox"));

    expect(screen.getByTestId("confirm-action-submit")).not.toBeDisabled();
  });

  it("calls onConfirm when confirm button is clicked with checkbox checked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmActionPanel {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByTestId("confirm-checkbox"));
    fireEvent.click(screen.getByTestId("confirm-action-submit"));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("does not call onConfirm when confirm button is clicked with checkbox unchecked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmActionPanel {...defaultProps} onConfirm={onConfirm} />);

    // Don't check the checkbox — fireEvent bypasses disabled check
    // handleConfirm guards: if (isChecked) onConfirm()
    fireEvent.click(screen.getByTestId("confirm-action-submit"));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmActionPanel {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId("confirm-action-cancel"));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows '...' instead of confirmLabel when isPending is true", () => {
    render(<ConfirmActionPanel {...defaultProps} isPending={true} />);

    // The submit button is always in the document -- only its label changes
    // while pending. So this asserts on the content of that one element, not
    // on the element's absence: a blind swap of queryByText for queryByTestId
    // claimed the button disappears, which it does not.
    const submit = screen.getByTestId("confirm-action-submit");
    expect(submit).toHaveTextContent("...");
    expect(submit).not.toHaveTextContent("Confirm");
  });

  it("shows confirmLabel when isPending is false", () => {
    render(<ConfirmActionPanel {...defaultProps} isPending={false} />);

    expect(screen.getByTestId("confirm-action-submit")).toHaveTextContent(
      "Confirm",
    );
  });

  it("disables both buttons when isPending is true", () => {
    render(<ConfirmActionPanel {...defaultProps} isPending={true} />);

    expect(screen.getByTestId("confirm-action-submit")).toBeDisabled();
    expect(screen.getByTestId("confirm-action-cancel")).toBeDisabled();
  });

  it("renders with reject variant", () => {
    render(
      <ConfirmActionPanel
        {...defaultProps}
        variant="reject"
        confirmLabel="Reject"
      />,
    );

    expect(screen.getByTestId("confirm-action-panel")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-action-submit")).toHaveTextContent(
      "Reject",
    );
  });

  it("renders checkboxLabel text", () => {
    render(<ConfirmActionPanel {...defaultProps} />);

    expect(screen.getByText("I understand")).toBeInTheDocument();
  });
});
