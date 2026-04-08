import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

let mockGrantedPermissions = [
  "seller_payment_methods.read",
  "seller_payment_methods.create",
  "seller_payment_methods.update",
  "seller_payment_methods.delete",
];

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({
    isLoading: false,
    hasPermission: (required: string | string[]) => {
      const requiredKeys = Array.isArray(required) ? required : [required];
      return requiredKeys.every((key) => mockGrantedPermissions.includes(key));
    },
  }),
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockInsert = { mutate: vi.fn(), isPending: false };
const mockUpdate = { mutate: vi.fn(), isPending: false };
const mockDelete = { mutate: vi.fn() };
const mockToggle = { mutate: vi.fn() };

vi.mock(
  "@/features/payment-methods/application/hooks/usePaymentMethodMutations",
  () => ({
    useInsertSellerPaymentMethod: () => mockInsert,
    useUpdateSellerPaymentMethod: () => mockUpdate,
    useDeleteSellerPaymentMethod: () => mockDelete,
    useToggleSellerPaymentMethodActive: () => mockToggle,
  }),
);

let mockTypesLoading = false;
let mockMethodsLoading = false;

vi.mock(
  "@/features/payment-methods/application/hooks/usePaymentMethods",
  () => ({
    usePaymentMethodTypes: () => ({
      data: mockTypesLoading
        ? undefined
        : [
            {
              id: "t1",
              name_en: "Cash",
              name_es: "Efectivo",
              icon: null,
              is_active: true,
            },
          ],
      isLoading: mockTypesLoading,
    }),
    useSellerPaymentMethods: () => ({
      data: mockMethodsLoading
        ? undefined
        : [
            {
              id: "m1",
              type_id: "t1",
              account_details_en: "Details",
              is_active: true,
            },
          ],
      isLoading: mockMethodsLoading,
    }),
  }),
);

vi.mock(
  "@/features/payment-methods/presentation/components/PaymentMethodEditor",
  () => ({
    PaymentMethodEditor: (props: Record<string, unknown>) => (
      <div data-testid="editor-mock">
        <button type="button" onClick={() => (props.onCancel as () => void)()}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            (props.onSave as (v: unknown) => void)({
              type_id: "t1",
              is_active: true,
            })
          }
        >
          Save
        </button>
      </div>
    ),
  }),
);

vi.mock(
  "@/features/payment-methods/presentation/components/PaymentMethodTable",
  () => ({
    PaymentMethodTable: (props: Record<string, unknown>) => (
      <div data-testid="table-mock">
        <button
          type="button"
          onClick={() => (props.onEdit as (m: unknown) => void)({ id: "m1" })}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => (props.onDelete as (id: string) => void)("m1")}
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() =>
            (props.onToggleActive as (id: string, a: boolean) => void)(
              "m1",
              false,
            )
          }
        >
          Toggle
        </button>
      </div>
    ),
  }),
);

import { PaymentMethodsPage } from "./PaymentMethodsPage";

describe("PaymentMethodsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTypesLoading = false;
    mockMethodsLoading = false;
    mockGrantedPermissions = [
      "seller_payment_methods.read",
      "seller_payment_methods.create",
      "seller_payment_methods.update",
      "seller_payment_methods.delete",
    ];
  });

  it("renders page title", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByTestId("payment-methods-title")).toBeInTheDocument();
  });

  it("shows table in closed mode", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByTestId("table-mock")).toBeInTheDocument();
  });

  it("opens editor when add button is clicked", () => {
    render(<PaymentMethodsPage />);
    fireEvent.click(screen.getByTestId("add-payment-method-button"));
    expect(screen.getByTestId("editor-mock")).toBeInTheDocument();
  });

  it("opens editor in edit mode", () => {
    render(<PaymentMethodsPage />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("editor-mock")).toBeInTheDocument();
  });

  it("closes editor on cancel", () => {
    render(<PaymentMethodsPage />);
    fireEvent.click(screen.getByTestId("add-payment-method-button"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByTestId("table-mock")).toBeInTheDocument();
  });

  it("calls insertMutation on save in create mode", () => {
    render(<PaymentMethodsPage />);
    fireEvent.click(screen.getByTestId("add-payment-method-button"));
    fireEvent.click(screen.getByText("Save"));
    expect(mockInsert.mutate).toHaveBeenCalled();
  });

  it("calls updateMutation on save in edit mode", () => {
    render(<PaymentMethodsPage />);
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Save"));
    expect(mockUpdate.mutate).toHaveBeenCalled();
  });

  it("calls deleteMutation on delete", () => {
    render(<PaymentMethodsPage />);
    fireEvent.click(screen.getByText("Delete"));
    expect(mockDelete.mutate).toHaveBeenCalledWith("m1");
  });

  it("shows loading state when types are loading", () => {
    mockTypesLoading = true;
    render(<PaymentMethodsPage />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("calls toggleMutation on toggle", () => {
    render(<PaymentMethodsPage />);
    fireEvent.click(screen.getByText("Toggle"));
    expect(mockToggle.mutate).toHaveBeenCalledWith({
      id: "m1",
      isActive: false,
    });
  });

  it("shows access denied without read permission", () => {
    mockGrantedPermissions = [];
    render(<PaymentMethodsPage />);
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
  });
});
