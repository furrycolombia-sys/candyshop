import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { SellerPaymentMethodWithType } from "@/features/checkout/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { PaymentMethodSelector } from "./PaymentMethodSelector";

const mockMethods: SellerPaymentMethodWithType[] = [
  {
    id: "pm-1",
    type_name_en: "Bank Transfer",
    type_name_es: "Transferencia",
    type_icon: "bank",
    requires_receipt: true,
    requires_transfer_number: true,
    account_details_en: "Bank ABC Account 12345",
    account_details_es: "Banco ABC Cuenta 12345",
    seller_note_en: "Please use your name as reference",
    seller_note_es: "Usa tu nombre como referencia",
  },
  {
    id: "pm-2",
    type_name_en: "Cash",
    type_name_es: "Efectivo",
    type_icon: null,
    requires_receipt: false,
    requires_transfer_number: false,
    account_details_en: null,
    account_details_es: null,
    seller_note_en: null,
    seller_note_es: null,
  },
];

describe("PaymentMethodSelector", () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a select with all methods as options", () => {
    render(
      <PaymentMethodSelector
        methods={mockMethods}
        selectedId={null}
        onSelect={mockOnSelect}
      />,
    );

    const select = screen.getByTestId("payment-method-select");
    expect(select).toBeInTheDocument();

    // Placeholder + 2 methods = 3 options
    // eslint-disable-next-line testing-library/no-node-access -- querySelectorAll needed to count <option> elements inside <select>
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(3);
  });

  it("displays method names in English by default", () => {
    render(
      <PaymentMethodSelector
        methods={mockMethods}
        selectedId={null}
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText("Bank Transfer")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
  });

  it("calls onSelect when an option is chosen", () => {
    render(
      <PaymentMethodSelector
        methods={mockMethods}
        selectedId={null}
        onSelect={mockOnSelect}
      />,
    );

    const select = screen.getByTestId("payment-method-select");
    fireEvent.change(select, { target: { value: "pm-1" } });

    expect(mockOnSelect).toHaveBeenCalledWith("pm-1");
  });

  it("shows account details and seller note when a method is selected", () => {
    render(
      <PaymentMethodSelector
        methods={mockMethods}
        selectedId="pm-1"
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByTestId("payment-account-details")).toHaveTextContent(
      "Bank ABC Account 12345",
    );
    expect(screen.getByTestId("payment-seller-note")).toHaveTextContent(
      "Please use your name as reference",
    );
  });

  it("does not show details when no method is selected", () => {
    render(
      <PaymentMethodSelector
        methods={mockMethods}
        selectedId={null}
        onSelect={mockOnSelect}
      />,
    );

    expect(
      screen.queryByTestId("payment-account-details"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("payment-seller-note")).not.toBeInTheDocument();
  });

  it("does not show details section for method without account details", () => {
    render(
      <PaymentMethodSelector
        methods={mockMethods}
        selectedId="pm-2"
        onSelect={mockOnSelect}
      />,
    );

    expect(
      screen.queryByTestId("payment-account-details"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("payment-seller-note")).not.toBeInTheDocument();
  });

  it("disables the select when disabled prop is true", () => {
    render(
      <PaymentMethodSelector
        methods={mockMethods}
        selectedId={null}
        onSelect={mockOnSelect}
        disabled
      />,
    );

    expect(screen.getByTestId("payment-method-select")).toBeDisabled();
  });
});
