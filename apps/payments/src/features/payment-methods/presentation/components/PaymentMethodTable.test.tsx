/* eslint-disable react/button-has-type */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div className={className} data-testid="skeleton" />
  ),
  Switch: ({
    checked,
    onCheckedChange,
    ...rest
  }: {
    checked: boolean;
    onCheckedChange: (c: boolean) => void;
    "data-testid"?: string;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      data-testid={rest["data-testid"]}
    />
  ),
}));

import { PaymentMethodTable } from "./PaymentMethodTable";

import type {
  PaymentMethodType,
  SellerPaymentMethod,
} from "@/features/payment-methods/domain/types";

const mockTypes: PaymentMethodType[] = [
  {
    id: "type-1",
    name_en: "Bank Transfer",
    name_es: "Transferencia",
    description_en: null,
    description_es: null,
    icon: null,
    requires_receipt: true,
    requires_transfer_number: false,
    is_active: true,
  },
];

const mockMethods: SellerPaymentMethod[] = [
  {
    id: "pm-1",
    seller_id: "seller-1",
    type_id: "type-1",
    account_details_en: "Account 123",
    account_details_es: "Cuenta 123",
    seller_note_en: null,
    seller_note_es: null,
    is_active: true,
    sort_order: 1,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  },
];

describe("PaymentMethodTable", () => {
  const defaultProps = {
    methods: mockMethods,
    types: mockTypes,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleActive: vi.fn(),
    isLoading: false,
  };

  it("shows skeleton loading state", () => {
    render(
      <PaymentMethodTable {...defaultProps} isLoading={true} methods={[]} />,
    );
    expect(
      screen.getByTestId("payment-methods-table-loading"),
    ).toBeInTheDocument();
  });

  it("shows empty state when no methods", () => {
    render(<PaymentMethodTable {...defaultProps} methods={[]} />);
    expect(
      screen.getByTestId("payment-methods-empty-state"),
    ).toBeInTheDocument();
    expect(screen.getByText("noMethods")).toBeInTheDocument();
  });

  it("renders the table with methods", () => {
    render(<PaymentMethodTable {...defaultProps} />);
    expect(screen.getByTestId("payment-methods-table")).toBeInTheDocument();
  });

  it("displays the payment type name", () => {
    render(<PaymentMethodTable {...defaultProps} />);
    expect(screen.getByText("Bank Transfer")).toBeInTheDocument();
  });

  it("renders edit button", () => {
    render(<PaymentMethodTable {...defaultProps} />);
    const editBtn = screen.getByTestId("payment-method-edit-pm-1");
    expect(editBtn).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn();
    render(<PaymentMethodTable {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByTestId("payment-method-edit-pm-1"));
    expect(onEdit).toHaveBeenCalledWith(mockMethods[0]);
  });

  it("calls onDelete when delete is confirmed", () => {
    const onDelete = vi.fn();
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    render(<PaymentMethodTable {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId("payment-method-delete-pm-1"));
    expect(onDelete).toHaveBeenCalledWith("pm-1");
    vi.restoreAllMocks();
  });

  it("does not call onDelete when delete is cancelled", () => {
    const onDelete = vi.fn();
    vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    render(<PaymentMethodTable {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId("payment-method-delete-pm-1"));
    expect(onDelete).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("falls back to type_id when type is not found", () => {
    const unknownMethod = { ...mockMethods[0], type_id: "unknown-type" };
    render(<PaymentMethodTable {...defaultProps} methods={[unknownMethod]} />);
    expect(screen.getByText("unknown-type")).toBeInTheDocument();
  });
});
