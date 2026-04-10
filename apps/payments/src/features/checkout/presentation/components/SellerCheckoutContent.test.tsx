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

vi.mock("./ReceiptUpload", () => ({
  ReceiptUpload: () => <div data-testid="receipt-upload">Upload</div>,
}));

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { SellerCheckoutContent } from "./SellerCheckoutContent";

const mockItems: CartItem[] = [
  {
    id: "p1",
    name_en: "Widget",
    name_es: "Widget",
    price_cop: 5000,
    price_usd: 1.5,
    seller_id: "s1",
    quantity: 2,
    images: [],
    max_quantity: 10,
  },
];

const mockMethods: SellerPaymentMethodWithType[] = [
  {
    id: "pm-1",
    type_name_en: "Bank Transfer",
    type_name_es: "Transferencia",
    type_icon: null,
    requires_receipt: true,
    requires_transfer_number: true,
    account_details_en: null,
    account_details_es: null,
    seller_note_en: null,
    seller_note_es: null,
  },
];

describe("SellerCheckoutContent", () => {
  const defaultProps = {
    sellerId: "s1",
    items: mockItems,
    subtotalCop: 10_000,
    getItemName: (item: CartItem) => item.name_en,
    isSubmitted: false,
    isSubmitting: false,
    isDisabled: false,
    error: null,
    hasStockIssues: false,
    isLoadingMethods: false,
    methods: mockMethods,
    selectedMethodId: null,
    selectedMethod: undefined,
    transferNumber: "",
    receiptFile: null,
    validationError: null,
    onSelectMethod: vi.fn(),
    onTransferNumberChange: vi.fn(),
    onReceiptFileChange: vi.fn(),
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
    render(<SellerCheckoutContent {...defaultProps} isLoadingMethods={true} />);
    expect(
      screen.queryByTestId("payment-method-selector"),
    ).not.toBeInTheDocument();
  });

  it("shows submitted badge when order is submitted", () => {
    render(<SellerCheckoutContent {...defaultProps} isSubmitted={true} />);
    expect(
      screen.getByTestId("seller-checkout-submitted-s1"),
    ).toBeInTheDocument();
    expect(screen.getByText("pendingVerification")).toBeInTheDocument();
  });

  it("shows error message when error is present", () => {
    render(
      <SellerCheckoutContent {...defaultProps} error="Something went wrong" />,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("translates stock_error to stockError", () => {
    render(<SellerCheckoutContent {...defaultProps} error="stock_error" />);
    expect(screen.getByText("stockError")).toBeInTheDocument();
  });

  it("hides payment information when stock issues are present", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        hasStockIssues={true}
        error="stock_error"
        selectedMethodId="pm-1"
        selectedMethod={mockMethods[0]}
      />,
    );

    expect(screen.getByText("stockError")).toBeInTheDocument();
    expect(
      screen.queryByTestId("payment-method-selector"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("receipt-upload")).not.toBeInTheDocument();
    expect(screen.queryByTestId("submit-payment-s1")).not.toBeInTheDocument();
  });

  it("shows transfer number input when selected method requires it", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        selectedMethodId="pm-1"
        selectedMethod={mockMethods[0]}
      />,
    );
    expect(screen.getByText("transferNumber")).toBeInTheDocument();
  });

  it("shows receipt upload when selected method requires it", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        selectedMethodId="pm-1"
        selectedMethod={mockMethods[0]}
      />,
    );
    expect(screen.getByTestId("receipt-upload")).toBeInTheDocument();
  });

  it("shows validation error when present", () => {
    render(
      <SellerCheckoutContent
        {...defaultProps}
        validationError="methodRequired"
      />,
    );
    expect(screen.getByText("methodRequired")).toBeInTheDocument();
  });

  it("calls onSubmit when submit button is clicked", () => {
    const onSubmit = vi.fn();
    render(
      <SellerCheckoutContent
        {...defaultProps}
        selectedMethodId="pm-1"
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
        selectedMethodId="pm-1"
        isSubmitting={true}
      />,
    );
    expect(screen.getByText("submitting")).toBeInTheDocument();
  });
});
