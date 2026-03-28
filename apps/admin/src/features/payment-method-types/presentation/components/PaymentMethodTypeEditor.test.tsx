/* eslint-disable vitest/expect-expect */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { PaymentMethodTypeEditor } from "./PaymentMethodTypeEditor";

describe("PaymentMethodTypeEditor", () => {
  const defaultProps = {
    isSaving: false,
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders the editor with test id", () => {
    render(<PaymentMethodTypeEditor {...defaultProps} />);
    expect(screen.getByTestId("payment-type-editor")).toBeInTheDocument();
  });

  it("renders name input fields", () => {
    render(<PaymentMethodTypeEditor {...defaultProps} />);
    expect(screen.getByTestId("payment-type-name-en")).toBeInTheDocument();
    expect(screen.getByTestId("payment-type-name-es")).toBeInTheDocument();
  });

  it("renders description input fields", () => {
    render(<PaymentMethodTypeEditor {...defaultProps} />);
    expect(screen.getByTestId("payment-type-desc-en")).toBeInTheDocument();
    expect(screen.getByTestId("payment-type-desc-es")).toBeInTheDocument();
  });

  it("renders icon input", () => {
    render(<PaymentMethodTypeEditor {...defaultProps} />);
    expect(screen.getByTestId("payment-type-icon")).toBeInTheDocument();
  });

  it("initializes with provided initial values", () => {
    const initial = {
      name_en: "Bank Transfer",
      name_es: "Transferencia",
      description_en: "Bank desc",
      description_es: "Desc banco",
      icon: "Building",
      requires_receipt: false,
      requires_transfer_number: true,
      is_active: true,
    };

    render(<PaymentMethodTypeEditor {...defaultProps} initial={initial} />);

    expect(screen.getByTestId("payment-type-name-en")).toHaveValue(
      "Bank Transfer",
    );
    expect(screen.getByTestId("payment-type-name-es")).toHaveValue(
      "Transferencia",
    );
  });

  it("calls onSave when save button is clicked", () => {
    const onSave = vi.fn();
    render(<PaymentMethodTypeEditor {...defaultProps} onSave={onSave} />);

    fireEvent.change(screen.getByTestId("payment-type-name-en"), {
      target: { value: "Cash" },
    });

    fireEvent.click(screen.getByTestId("payment-type-save"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].name_en).toBe("Cash");
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<PaymentMethodTypeEditor {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId("payment-type-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows saving text when isSaving", () => {
    render(<PaymentMethodTypeEditor {...defaultProps} isSaving={true} />);
    expect(screen.getByTestId("payment-type-save")).toHaveTextContent("saving");
  });

  it("disables save button when isSaving", () => {
    render(<PaymentMethodTypeEditor {...defaultProps} isSaving={true} />);
    expect(screen.getByTestId("payment-type-save")).toBeDisabled();
  });

  it("uses form defaults when no initial is provided", () => {
    render(<PaymentMethodTypeEditor {...defaultProps} />);
    // Default values: empty strings for text, true for booleans
    expect(screen.getByTestId("payment-type-name-en")).toHaveValue("");
    expect(screen.getByTestId("payment-type-name-es")).toHaveValue("");
  });

  it("toggles requires_receipt checkbox", () => {
    render(<PaymentMethodTypeEditor {...defaultProps} />);
    const toggle = screen.getByTestId("payment-type-requires-receipt");
    fireEvent.click(toggle);
  });

  it("toggles requires_transfer_number checkbox", () => {
    render(<PaymentMethodTypeEditor {...defaultProps} />);
    const toggle = screen.getByTestId("payment-type-requires-transfer");
    fireEvent.click(toggle);
  });

  it("toggles is_active checkbox", () => {
    render(<PaymentMethodTypeEditor {...defaultProps} />);
    const toggle = screen.getByTestId("payment-type-is-active");
    fireEvent.click(toggle);
  });
});
