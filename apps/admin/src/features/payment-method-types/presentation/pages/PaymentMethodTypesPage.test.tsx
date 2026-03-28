import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

const mockInsert = { mutate: vi.fn(), isPending: false };
const mockUpdate = { mutate: vi.fn(), isPending: false };
const mockDelete = { mutate: vi.fn() };
const mockToggle = { mutate: vi.fn() };

vi.mock(
  "@/features/payment-method-types/application/hooks/usePaymentMethodTypeMutations",
  () => ({
    useInsertPaymentMethodType: () => mockInsert,
    useUpdatePaymentMethodType: () => mockUpdate,
    useDeletePaymentMethodType: () => mockDelete,
    useTogglePaymentMethodTypeActive: () => mockToggle,
  }),
);

vi.mock(
  "@/features/payment-method-types/application/hooks/usePaymentMethodTypes",
  () => ({
    usePaymentMethodTypes: () => ({
      data: [
        {
          id: "p1",
          name_en: "Cash",
          name_es: "Efectivo",
          description_en: null,
          description_es: null,
          icon: null,
          requires_receipt: false,
          requires_transfer_number: false,
          is_active: true,
          sort_order: 1,
          created_at: "",
          updated_at: "",
        },
      ],
      isLoading: false,
    }),
  }),
);

vi.mock(
  "@/features/payment-method-types/presentation/components/PaymentMethodTypeEditor",
  () => ({
    PaymentMethodTypeEditor: ({
      onCancel,
      onSave,
    }: {
      onCancel: () => void;
      onSave: (v: unknown) => void;
    }) => (
      <div data-testid="editor-mock">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            onSave({ name: "Card", icon: "card", is_active: true })
          }
        >
          Save
        </button>
      </div>
    ),
  }),
);

vi.mock(
  "@/features/payment-method-types/presentation/components/PaymentMethodTypeTable",
  () => ({
    PaymentMethodTypeTable: ({
      onEdit,
      onDelete,
      onToggleActive,
    }: {
      onEdit: (t: unknown) => void;
      onDelete: (id: string) => void;
      onToggleActive: (id: string, active: boolean) => void;
    }) => (
      <div data-testid="table-mock">
        <button
          type="button"
          onClick={() =>
            onEdit({
              id: "p1",
              name_en: "Cash",
              name_es: "Efectivo",
              description_en: null,
              description_es: null,
              icon: null,
              requires_receipt: false,
              requires_transfer_number: false,
              is_active: true,
            })
          }
        >
          Edit
        </button>
        <button type="button" onClick={() => onDelete("p1")}>
          Delete
        </button>
        <button type="button" onClick={() => onToggleActive("p1", false)}>
          Toggle
        </button>
      </div>
    ),
  }),
);

import { PaymentMethodTypesPage } from "./PaymentMethodTypesPage";

describe("PaymentMethodTypesPage", () => {
  it("renders the page with title", () => {
    render(<PaymentMethodTypesPage />);
    expect(screen.getByTestId("payment-types-title")).toHaveTextContent(
      "title",
    );
  });

  it("shows the table when editor is closed", () => {
    render(<PaymentMethodTypesPage />);
    expect(screen.getByTestId("table-mock")).toBeInTheDocument();
  });

  it("shows add button when editor is closed", () => {
    render(<PaymentMethodTypesPage />);
    expect(screen.getByTestId("payment-types-add")).toBeInTheDocument();
  });

  it("opens editor when add button is clicked", () => {
    render(<PaymentMethodTypesPage />);
    fireEvent.click(screen.getByTestId("payment-types-add"));
    expect(screen.getByTestId("editor-mock")).toBeInTheDocument();
  });

  it("opens editor when edit is triggered from table", () => {
    render(<PaymentMethodTypesPage />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("editor-mock")).toBeInTheDocument();
  });

  it("closes editor when cancel is clicked", () => {
    render(<PaymentMethodTypesPage />);
    fireEvent.click(screen.getByTestId("payment-types-add"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByTestId("table-mock")).toBeInTheDocument();
  });

  it("handleSave calls insertMutation in create mode", () => {
    render(<PaymentMethodTypesPage />);
    fireEvent.click(screen.getByTestId("payment-types-add"));
    fireEvent.click(screen.getByText("Save"));
    expect(mockInsert.mutate).toHaveBeenCalled();
  });

  it("handleSave calls updateMutation in edit mode", () => {
    render(<PaymentMethodTypesPage />);
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Save"));
    expect(mockUpdate.mutate).toHaveBeenCalled();
  });

  it("onDelete calls deleteMutation", () => {
    render(<PaymentMethodTypesPage />);
    fireEvent.click(screen.getByText("Delete"));
    expect(mockDelete.mutate).toHaveBeenCalledWith("p1");
  });

  it("onToggleActive calls toggleMutation", () => {
    render(<PaymentMethodTypesPage />);
    fireEvent.click(screen.getByText("Toggle"));
    expect(mockToggle.mutate).toHaveBeenCalledWith({
      id: "p1",
      isActive: false,
    });
  });
});
