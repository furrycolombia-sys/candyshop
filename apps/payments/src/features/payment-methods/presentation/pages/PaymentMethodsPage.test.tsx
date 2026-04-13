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
    PaymentMethodEditor: (props: Record<string, unknown>) => (
      <div data-testid="editor-mock">
        <button type="button" onClick={() => (props.onClose as () => void)()}>
          Close
        </button>
      </div>
    ),
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

  it("renders page content", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByTestId("payment-methods-page")).toBeInTheDocument();
  });

  it("shows add button when canCreate", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByTestId("add-payment-method-button")).toBeInTheDocument();
  });

  it("shows method list", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByText("Cash")).toBeInTheDocument();
  });

  it("opens create form when add button is clicked", () => {
    render(<PaymentMethodsPage />);
    fireEvent.click(screen.getByTestId("add-payment-method-button"));
    // Create form should appear (no longer shows editor-mock directly)
    expect(
      screen.queryByTestId("add-payment-method-button"),
    ).not.toBeInTheDocument();
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

  it("shows edit buttons for each method when canUpdate", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByTestId("payment-method-edit")).toBeInTheDocument();
  });

  it("shows delete buttons for each method when canDelete", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByTestId("payment-method-delete")).toBeInTheDocument();
  });

  it("shows active toggle for each method when canUpdate", () => {
    render(<PaymentMethodsPage />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });
});
