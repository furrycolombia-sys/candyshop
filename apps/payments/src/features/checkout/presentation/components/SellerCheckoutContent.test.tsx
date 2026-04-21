/* eslint-disable react/button-has-type */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  CartItem,
  SellerPaymentMethodWithType,
} from "@/features/checkout/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nField: (obj: Record<string, unknown>, field: string, locale: string) => {
    const key = `${field}_${locale}`;
    return (obj[key] as string) ?? (obj[`${field}_en`] as string) ?? "";
  },
}));

vi.mock("ui", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("./CheckoutItemsSummary", () => ({
  CheckoutItemsSummary: () => (
    <div data-testid="checkout-items-summary">Items</div>
  ),
}));

vi.mock("./PaymentMethodSelector", () => ({
  PaymentMethodSelector: ({
    onSelect,
  }: {
    methods: SellerPaymentMethodWithType[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="payment-method-selector">
      <button data-testid="mock-select-method" onClick={() => onSelect("pm-1")}>
        Select
      </button>
    </div>
  ),
}));

vi.mock("./DisplayBlockRenderer", () => ({
  DisplayBlockRenderer: () => (
    <div data-testid="display-block-renderer">Block</div>
  ),
}));

vi.mock("./DynamicFormField", () => ({
  DynamicFormField: ({
    field,
  }: {
    field: { id: string; label_en: string };
  }) => <div data-testid={`dynamic-field-${field.id}`}>{field.label_en}</div>,
}));

vi.mock("api/supabase", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({})),
}));

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { SellerCheckoutContent } from "./SellerCheckoutContent";

const mockItems: CartItem[] = [
  {
    id: "p1",
    name_en: "Widget",
    name_es: "Widget",
    price: 5000,
    currency: "COP",
    seller_id: "s1",
    quantity: 2,
    images: [],
    max_quantity: 10,
  },
];

const mockMethodWithFields: SellerPaymentMethodWithType = {
  id: "pm-1",
  name_en: "Bank Transfer",
  name_es: "Transferencia",
  display_blocks: [],
  form_fields: [
    { id: "f1", type: "text", label_en: "Full Name", required: true },
  ],
  is_active: true,
};

const mockMethodWithBlocks: SellerPaymentMethodWithType = {
  id: "pm-2",
  name_en: "Nequi",
  name_es: "Nequi",
  display_blocks: [
    { id: "b1", type: "text", content_en: "Send to 3001234567" },
  ],
  form_fields: [],
  is_active: true,
};

describe("SellerCheckoutContent", () => {
  const defaultProps = {
    sellerId: "s1",
    items: mockItems,
    subtotal: 10_000,
    currency: "COP",
    getItemName: (item: CartItem) => item.name_en,
    submission: {
      isSubmitted: false,
      isSubmitting: false,
      isDisabled: false,
      error: null,
      hasStockIssues: false,
    },
    methodSelection: {
      isLoadingMethods: false,
      methods: [mockMethodWithFields],
      selectedMethodId: null,
      selectedMethod: undefined,
      onSelectMethod: vi.fn(),
    },
    buyerForm: {
      buyerSubmission: {},
      validationError: null,
      onBuyerSubmissionChange: vi.fn(),
      onFileSelected: vi.fn(),
    },
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders items summary", () => {
    render(<SellerCheckoutContent {...defaultProps} />);
    expect(screen.getByTestId("checkout-items-summary")).toBeInTheDocument();
  });

  it("shows payment method selector when not submitted and not loading", () => {
    render(<SellerCheckoutContent {...defaultProps} />);
    expect(screen.getByTestId("payment-method-selector")).toBeInTheDocument();
  });

  it("shows loading spinner when loading methods", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        methodSelection={{
          ...defaultProps.methodSelection,
          isLoadingMethods: true,
        }}
      />,
    );
    expect(
      screen.queryByTestId("payment-method-selector"),
    ).not.toBeInTheDocument();
  });

  it("shows submitted badge when order is submitted", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        submission={{ ...defaultProps.submission, isSubmitted: true }}
      />,
    );
    expect(
      screen.getByTestId("seller-checkout-submitted-s1"),
    ).toBeInTheDocument();
    expect(screen.getByText("pendingVerification")).toBeInTheDocument();
  });

  it("shows error message when error is present", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        submission={{
          ...defaultProps.submission,
          error: "Something went wrong",
        }}
      />,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("translates stock_error to stockError", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        submission={{ ...defaultProps.submission, error: "stock_error" }}
      />,
    );
    expect(screen.getByText("stockError")).toBeInTheDocument();
  });

  it("hides payment information when stock issues are present", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        submission={{
          ...defaultProps.submission,
          hasStockIssues: true,
          error: "stock_error",
        }}
        methodSelection={{
          ...defaultProps.methodSelection,
          selectedMethodId: "pm-1",
          selectedMethod: mockMethodWithFields,
        }}
      />,
    );

    expect(screen.getByText("stockError")).toBeInTheDocument();
    expect(
      screen.queryByTestId("payment-method-selector"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("submit-payment-s1")).not.toBeInTheDocument();
  });

  it("shows form fields when a method with form_fields is selected", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        methodSelection={{
          ...defaultProps.methodSelection,
          selectedMethodId: "pm-1",
          selectedMethod: mockMethodWithFields,
        }}
      />,
    );
    expect(screen.getByTestId("dynamic-field-f1")).toBeInTheDocument();
  });

  it("shows display blocks when a method with display_blocks is selected", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        methodSelection={{
          ...defaultProps.methodSelection,
          methods: [mockMethodWithBlocks],
          selectedMethodId: "pm-2",
          selectedMethod: mockMethodWithBlocks,
        }}
      />,
    );
    expect(screen.getByTestId("display-block-renderer")).toBeInTheDocument();
  });

  it("shows validation error when present", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        buyerForm={{
          ...defaultProps.buyerForm,
          validationError: "methodRequired",
        }}
      />,
    );
    expect(screen.getByText("methodRequired")).toBeInTheDocument();
  });

  it("calls onSubmit when submit button is clicked", () => {
    const onSubmit = vi.fn();
    render(
      <SellerCheckoutContent
        {...defaultProps}
        methodSelection={{
          ...defaultProps.methodSelection,
          selectedMethodId: "pm-1",
        }}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByTestId("submit-payment-s1"));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("disables submit button when no method selected", () => {
    render(<SellerCheckoutContent {...defaultProps} />);
    expect(screen.getByTestId("submit-payment-s1")).toBeDisabled();
  });

  it("shows submitting label when isSubmitting", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        methodSelection={{
          ...defaultProps.methodSelection,
          selectedMethodId: "pm-1",
        }}
        submission={{ ...defaultProps.submission, isSubmitting: true }}
      />,
    );
    expect(screen.getByText("submitting")).toBeInTheDocument();
  });
});
