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
  useLocale: () => "en",
}));

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({
    isLoading: false,
    hasPermission: (required: string | string[]) => {
      const requiredKeys = Array.isArray(required) ? required : [required];
      return requiredKeys.every((key) => mockGrantedPermissions.includes(key));
    },
  }),
  useSupabaseAuth: () => ({ user: { id: "seller-1" } }),
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nField: (obj: Record<string, unknown>, field: string, locale: string) => {
    const key = `${field}_${locale}`;
    return (obj[key] as string) ?? (obj[`${field}_en`] as string) ?? "";
  },
}));

vi.mock("ui", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Skeleton: () => <div data-testid="skeleton" />,
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
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
    />
  ),
}));

const mockCreate = { mutate: vi.fn(), isPending: false };
const mockUpdate = { mutate: vi.fn(), isPending: false };
const mockDelete = { mutate: vi.fn() };

vi.mock(
  "@/features/payment-methods/application/hooks/usePaymentMethodMutations",
  () => ({
    useCreatePaymentMethod: () => mockCreate,
    useUpdatePaymentMethod: () => mockUpdate,
    useDeletePaymentMethod: () => mockDelete,
  }),
);

let mockMethodsLoading = false;

vi.mock(
  "@/features/payment-methods/application/hooks/usePaymentMethods",
  () => ({
    usePaymentMethods: () => ({
      data: mockMethodsLoading
        ? undefined
        : [
            {
              id: "m1",
              seller_id: "seller-1",
              name_en: "Cash",
              name_es: "Efectivo",
              display_blocks: [],
              form_fields: [],
              is_active: true,
              sort_order: 1,
              created_at: "2025-01-01",
              updated_at: "2025-01-01",
            },
          ],
      isLoading: mockMethodsLoading,
    }),
  }),
);

vi.mock(
  "@/features/payment-methods/presentation/components/PaymentMethodEditor",
  () => ({
    PaymentMethodEditor: () => <div data-testid="editor-mock">Editor</div>,
  }),
);

import { PaymentMethodsPage } from "./PaymentMethodsPage";

describe("PaymentMethodsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMethodsLoading = false;
    mockGrantedPermissions = [
      "seller_payment_methods.read",
      "seller_payment_methods.create",
      "seller_payment_methods.update",
      "seller_payment_methods.delete",
    ];
  });

  it("renders page content with method list", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByTestId("payment-methods-page")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
  });

  it("shows add button when canCreate", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByTestId("add-payment-method-button")).toBeInTheDocument();
  });

  it("calls create mutation when add button is clicked", () => {
    render(<PaymentMethodsPage />);
    fireEvent.click(screen.getByTestId("add-payment-method-button"));
    expect(mockCreate.mutate).toHaveBeenCalledWith(
      { sellerId: "seller-1", nameEn: "newMethodDefault" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("expands editor inline when method name is clicked", () => {
    render(<PaymentMethodsPage />);
    expect(screen.queryByTestId("editor-mock")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("payment-method-name"));
    expect(screen.getByTestId("editor-mock")).toBeInTheDocument();
  });

  it("collapses editor when same method name is clicked again", () => {
    render(<PaymentMethodsPage />);
    fireEvent.click(screen.getByTestId("payment-method-name"));
    expect(screen.getByTestId("editor-mock")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("payment-method-name"));
    expect(screen.queryByTestId("editor-mock")).not.toBeInTheDocument();
  });

  it("shows loading state when methods are loading", () => {
    mockMethodsLoading = true;
    render(<PaymentMethodsPage />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows access denied without read permission", () => {
    mockGrantedPermissions = [];
    render(<PaymentMethodsPage />);
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
  });

  it("shows delete button for each method when canDelete", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByTestId("payment-method-delete")).toBeInTheDocument();
  });

  it("shows active toggle for each method when canUpdate", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("add button stays visible alongside the list", () => {
    render(<PaymentMethodsPage />);
    // Both the add button and the method list are visible simultaneously
    expect(screen.getByTestId("add-payment-method-button")).toBeInTheDocument();
    expect(screen.getByTestId("payment-method-row")).toBeInTheDocument();
  });
});
