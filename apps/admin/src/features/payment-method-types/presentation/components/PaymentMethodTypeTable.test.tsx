import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { PaymentMethodTypeTable } from "./PaymentMethodTypeTable";

import type { PaymentMethodType } from "@/features/payment-method-types/domain/types";

const makeType = (
  overrides: Partial<PaymentMethodType> = {},
): PaymentMethodType => ({
  id: "pmt-1",
  name_en: "Bank Transfer",
  name_es: "Transferencia",
  description_en: "Transfer money",
  description_es: "Transferir dinero",
  icon: "Building",
  requires_receipt: true,
  requires_transfer_number: true,
  is_active: true,
  sort_order: 1,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("PaymentMethodTypeTable", () => {
  const defaultProps = {
    types: [] as PaymentMethodType[],
    isLoading: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleActive: vi.fn(),
  };

  it("shows loading state", () => {
    render(<PaymentMethodTypeTable {...defaultProps} isLoading={true} />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<PaymentMethodTypeTable {...defaultProps} />);
    expect(screen.getByTestId("payment-types-empty")).toBeInTheDocument();
    expect(screen.getByText("noTypes")).toBeInTheDocument();
  });

  it("renders table with types", () => {
    render(<PaymentMethodTypeTable {...defaultProps} types={[makeType()]} />);
    expect(screen.getByTestId("payment-types-table")).toBeInTheDocument();
    expect(screen.getByTestId("payment-type-row-pmt-1")).toBeInTheDocument();
  });

  it("renders EN name for en locale", () => {
    render(<PaymentMethodTypeTable {...defaultProps} types={[makeType()]} />);
    expect(screen.getByText("Bank Transfer")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn();
    const types = [makeType()];
    render(
      <PaymentMethodTypeTable
        {...defaultProps}
        types={types}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByTestId("payment-type-edit-pmt-1"));
    expect(onEdit).toHaveBeenCalledWith(types[0]);
  });

  it("calls onDelete when delete is confirmed", () => {
    const onDelete = vi.fn();
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);

    render(
      <PaymentMethodTypeTable
        {...defaultProps}
        types={[makeType()]}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId("payment-type-delete-pmt-1"));
    expect(onDelete).toHaveBeenCalledWith("pmt-1");
  });

  it("does not delete when confirm is cancelled", () => {
    const onDelete = vi.fn();
    vi.spyOn(globalThis, "confirm").mockReturnValue(false);

    render(
      <PaymentMethodTypeTable
        {...defaultProps}
        types={[makeType()]}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId("payment-type-delete-pmt-1"));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("shows checkmarks for requires_receipt and requires_transfer_number when true", () => {
    render(
      <PaymentMethodTypeTable
        {...defaultProps}
        types={[
          makeType({
            requires_receipt: true,
            requires_transfer_number: true,
          }),
        ]}
      />,
    );
    expect(screen.getAllByText("\u2713")).toHaveLength(2);
  });

  it("shows dash for null description", () => {
    render(
      <PaymentMethodTypeTable
        {...defaultProps}
        types={[makeType({ description_en: null })]}
      />,
    );
    // em-dash for null description
    expect(screen.getAllByText("\u2014").length).toBeGreaterThan(0);
  });

  it("calls onToggleActive when switch is toggled", () => {
    const onToggleActive = vi.fn();
    render(
      <PaymentMethodTypeTable
        {...defaultProps}
        types={[makeType()]}
        onToggleActive={onToggleActive}
      />,
    );
    const toggle = screen.getByTestId("payment-type-active-pmt-1");
    fireEvent.click(toggle);
    expect(onToggleActive).toHaveBeenCalled();
  });
});
