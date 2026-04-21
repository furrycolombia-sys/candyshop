import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { SellerPaymentMethodWithType } from "@/features/checkout/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shared")>();
  return {
    ...actual,
    tid: (id: string) => ({ "data-testid": id }),
    i18nField: (
      obj: Record<string, unknown>,
      field: string,
      locale: string,
    ) => {
      const key = `${field}_${locale}`;
      return (obj[key] as string) ?? (obj[`${field}_en`] as string) ?? "";
    },
  };
});

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { PaymentMethodSelector } from "./PaymentMethodSelector";

const mockMethods: SellerPaymentMethodWithType[] = [
  {
    id: "pm-1",
    name_en: "Bank Transfer",
    name_es: "Transferencia",
    display_blocks: [],
    form_fields: [],
    is_active: true,
    requires_receipt: false,
    requires_transfer_number: false,
  },
  {
    id: "pm-2",
    name_en: "Cash",
    name_es: "Efectivo",
    display_blocks: [],
    form_fields: [],
    is_active: true,
    requires_receipt: false,
    requires_transfer_number: false,
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
