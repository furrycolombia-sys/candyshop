/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (c: boolean) => void;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={String(checked) as "true" | "false"}
      onClick={() => onCheckedChange(!checked)}
    />
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

const mockUpdateMutate = vi.fn();

vi.mock(
  "@/features/payment-methods/application/hooks/usePaymentMethodMutations",
  () => ({
    useUpdatePaymentMethod: () => ({
      mutate: mockUpdateMutate,
      isPending: false,
    }),
  }),
);

vi.mock(
  "@/features/payment-methods/presentation/components/DisplaySectionEditor",
  () => ({
    DisplaySectionEditor: () => (
      <div data-testid="display-section-editor">Display</div>
    ),
  }),
);

vi.mock(
  "@/features/payment-methods/presentation/components/FormSectionEditor",
  () => ({
    FormSectionEditor: () => <div data-testid="form-section-editor">Form</div>,
  }),
);

import { PaymentMethodEditor } from "@/features/payment-methods/presentation/components/PaymentMethodEditor";

import type { SellerPaymentMethod } from "@/features/payment-methods/domain/types";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const mockMethod: SellerPaymentMethod = {
  id: "pm-1",
  seller_id: "seller-1",
  name_en: "Bank Transfer",
  name_es: "Transferencia",
  display_blocks: [],
  form_fields: [],
  is_active: true,
  requires_receipt: false,
  requires_transfer_number: false,
  sort_order: 1,
  created_at: "2025-01-01",
  updated_at: "2025-01-01",
};

describe("PaymentMethodEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders name_en input with initial value", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    const input = screen.getByTestId(
      "payment-method-name-en",
    ) as HTMLInputElement;
    expect(input.value).toBe("Bank Transfer");
  });

  it("renders name_es input with initial value", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    const input = screen.getByTestId(
      "payment-method-name-es",
    ) as HTMLInputElement;
    expect(input.value).toBe("Transferencia");
  });

  it("renders display section editor", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByTestId("display-section-editor")).toBeInTheDocument();
  });

  it("renders form section editor", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByTestId("form-section-editor")).toBeInTheDocument();
  });

  it("shows validation error when name_en is cleared", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    const input = screen.getByTestId("payment-method-name-en");
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByText("nameRequired")).toBeInTheDocument();
  });

  it("save button is disabled when nothing has changed", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    const saveBtn = screen.getByTestId("payment-method-save");
    expect(saveBtn).toBeDisabled();
  });

  it("save button becomes enabled after a field changes", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    const input = screen.getByTestId("payment-method-name-en");
    fireEvent.change(input, { target: { value: "Updated Name" } });
    expect(screen.getByTestId("payment-method-save")).not.toBeDisabled();
  });

  it("save button is disabled when name_en is empty even if dirty", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    const input = screen.getByTestId("payment-method-name-en");
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByTestId("payment-method-save")).toBeDisabled();
  });

  it("clicking save calls updatePaymentMethod with all current fields", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    const input = screen.getByTestId("payment-method-name-en");
    fireEvent.change(input, { target: { value: "New Name" } });

    fireEvent.click(screen.getByTestId("payment-method-save"));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "pm-1",
        patch: expect.objectContaining({ name_en: "New Name" }),
      }),
      expect.any(Object),
    );
  });

  it("updates nameEs when ES name input changes", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    const input = screen.getByTestId(
      "payment-method-name-es",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Nuevo Nombre" } });
    expect(input.value).toBe("Nuevo Nombre");
  });

  it("toggles requiresReceipt when its checkbox is clicked", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    const checkbox = screen.getByTestId(
      "payment-method-requires-receipt",
    ) as HTMLInputElement;
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("toggles requiresTransferNumber when its checkbox is clicked", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    const checkbox = screen.getByTestId(
      "payment-method-requires-transfer-number",
    ) as HTMLInputElement;
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("defaults nameEs to empty string when method.name_es is null", () => {
    const methodWithNullEs: SellerPaymentMethod = {
      ...mockMethod,
      name_es: null,
    };
    render(<PaymentMethodEditor method={methodWithNullEs} />, {
      wrapper: createWrapper(),
    });
    const input = screen.getByTestId(
      "payment-method-name-es",
    ) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("includes updated nameEs in the save payload", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    const input = screen.getByTestId("payment-method-name-es");
    fireEvent.change(input, { target: { value: "Transferencia Actualizada" } });
    fireEvent.click(screen.getByTestId("payment-method-save"));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({
          name_es: "Transferencia Actualizada",
        }),
      }),
      expect.any(Object),
    );
  });

  it("includes requiresReceipt and requiresTransferNumber when toggled and saved", () => {
    render(<PaymentMethodEditor method={mockMethod} />, {
      wrapper: createWrapper(),
    });
    fireEvent.click(screen.getByTestId("payment-method-requires-receipt"));
    fireEvent.click(
      screen.getByTestId("payment-method-requires-transfer-number"),
    );
    fireEvent.click(screen.getByTestId("payment-method-save"));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({
          requires_receipt: true,
          requires_transfer_number: true,
        }),
      }),
      expect.any(Object),
    );
  });
});
