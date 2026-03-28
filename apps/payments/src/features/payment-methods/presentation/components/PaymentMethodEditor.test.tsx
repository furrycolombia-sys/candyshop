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
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "data-testid"?: string;
    [key: string]: unknown;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={rest["data-testid"]}
    >
      {children}
    </button>
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock props
  Textarea: (props: any) => <textarea {...props} />,
}));

import { PaymentMethodEditor } from "./PaymentMethodEditor";

import type { PaymentMethodType } from "@/features/payment-methods/domain/types";

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
  {
    id: "type-2",
    name_en: "Cash",
    name_es: "Efectivo",
    description_en: null,
    description_es: null,
    icon: null,
    requires_receipt: false,
    requires_transfer_number: false,
    is_active: true,
  },
];

describe("PaymentMethodEditor", () => {
  const defaultProps = {
    types: mockTypes,
    onSave: vi.fn(),
    onCancel: vi.fn(),
    isPending: false,
  };

  it("renders in create mode by default", () => {
    render(<PaymentMethodEditor {...defaultProps} />);
    expect(screen.getByText("addMethod")).toBeInTheDocument();
  });

  it("renders in edit mode when initial has type_id", () => {
    render(
      <PaymentMethodEditor
        {...defaultProps}
        initial={{
          type_id: "type-1",
          account_details_en: "Account 123",
          account_details_es: "",
          seller_note_en: "",
          seller_note_es: "",
          is_active: true,
        }}
      />,
    );
    expect(screen.getByText("editMethod")).toBeInTheDocument();
  });

  it("renders type options in the select", () => {
    render(<PaymentMethodEditor {...defaultProps} />);
    const select = screen.getByTestId("payment-method-type-select");
    expect(select).toBeInTheDocument();
    // Check type options are rendered
    expect(screen.getByText("Bank Transfer")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
  });

  it("disables select in edit mode", () => {
    render(
      <PaymentMethodEditor
        {...defaultProps}
        initial={{
          type_id: "type-1",
          account_details_en: "",
          account_details_es: "",
          seller_note_en: "",
          seller_note_es: "",
          is_active: true,
        }}
      />,
    );
    const select = screen.getByTestId(
      "payment-method-type-select",
    ) as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });

  it("disables save when no type is selected", () => {
    render(<PaymentMethodEditor {...defaultProps} />);
    const saveBtn = screen.getByTestId("payment-method-save");
    expect(saveBtn).toBeDisabled();
  });

  it("calls onCancel when cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<PaymentMethodEditor {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId("payment-method-cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onSave with form values when save is clicked", () => {
    const onSave = vi.fn();
    render(
      <PaymentMethodEditor
        {...defaultProps}
        onSave={onSave}
        initial={{
          type_id: "type-1",
          account_details_en: "Details",
          account_details_es: "",
          seller_note_en: "",
          seller_note_es: "",
          is_active: true,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("payment-method-save"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type_id: "type-1" }),
    );
  });

  it("shows saving text when isPending", () => {
    render(<PaymentMethodEditor {...defaultProps} isPending={true} />);
    expect(screen.getByText("saving")).toBeInTheDocument();
  });

  it("renders textarea fields", () => {
    render(<PaymentMethodEditor {...defaultProps} />);
    expect(screen.getByTestId("payment-method-account-en")).toBeInTheDocument();
    expect(screen.getByTestId("payment-method-account-es")).toBeInTheDocument();
    expect(screen.getByTestId("payment-method-note-en")).toBeInTheDocument();
    expect(screen.getByTestId("payment-method-note-es")).toBeInTheDocument();
  });

  it("updates form fields when user types", () => {
    render(<PaymentMethodEditor {...defaultProps} />);
    const accountEn = screen.getByTestId(
      "payment-method-account-en",
    ) as HTMLTextAreaElement;
    fireEvent.change(accountEn, { target: { value: "New account details" } });
    expect(accountEn.value).toBe("New account details");
  });
});
