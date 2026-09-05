import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useSellerPaymentMethods } from "@/features/checkout/application/hooks/useSellerPaymentMethods";
import type {
  CartItem,
  SellerPaymentMethodWithType,
} from "@/features/checkout/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  },
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  formatPrice: (amount: number, currency: string) =>
    `${amount.toLocaleString()} ${currency}`,
}));

vi.mock(
  "@/features/checkout/application/hooks/useSellerPaymentMethods",
  () => ({
    useSellerPaymentMethods: vi.fn(() => ({
      data: {
        methods: [],
        hasStockIssues: false,
      },
      isLoading: false,
    })),
  }),
);

vi.mock(
  "@/features/checkout/presentation/components/SellerCheckoutContent",
  () => ({
    SellerCheckoutContent: ({
      submission,
      methodSelection,
      buyerForm,
      onSubmit,
    }: {
      submission: { hasStockIssues: boolean; error: string | null };
      methodSelection: {
        methods: Array<{ id: string }>;
        onSelectMethod: (id: string) => void;
      };
      buyerForm: {
        validationError: string | null;
        onReceiptChange: (file: File | null) => void;
        onTransferNumberChange: (value: string) => void;
      };
      onSubmit: () => void;
    }) => (
      <div
        data-testid="seller-checkout-content"
        data-has-stock-issues={String(submission.hasStockIssues)}
        data-error={submission.error ?? ""}
      >
        <span data-testid="validation-error">
          {buyerForm.validationError ?? ""}
        </span>
        <button type="button" data-testid="trigger-submit" onClick={onSubmit}>
          Submit
        </button>
        <button
          type="button"
          data-testid="select-first-method"
          onClick={() =>
            methodSelection.methods[0] &&
            methodSelection.onSelectMethod(methodSelection.methods[0].id)
          }
        >
          Select First Method
        </button>
        <button
          type="button"
          data-testid="set-receipt"
          onClick={() => buyerForm.onReceiptChange(new File([], "r.png"))}
        >
          Set Receipt
        </button>
        <button
          type="button"
          data-testid="set-transfer"
          onClick={() => buyerForm.onTransferNumberChange("TX-123")}
        >
          Set Transfer
        </button>
      </div>
    ),
  }),
);

import { SellerCheckoutCard } from "@/features/checkout/presentation/components/SellerCheckoutCard";

function makeMethod(
  overrides: Partial<SellerPaymentMethodWithType> = {},
): SellerPaymentMethodWithType {
  return {
    id: "pm-1",
    name_en: "Transfer",
    name_es: null,
    display_blocks: [],
    form_fields: [],
    is_active: true,
    requires_receipt: false,
    requires_transfer_number: false,
    ...overrides,
  };
}

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

describe("SellerCheckoutCard", () => {
  const defaultProps = {
    sellerId: "s1",
    sellerName: "Test Seller",
    items: mockItems,
    subtotal: 10_000,
    currency: "COP",
    status: "pending" as const,
    error: null,
    getItemName: (item: CartItem) => item.name_en,
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSellerPaymentMethods).mockReturnValue({
      data: { methods: [], hasStockIssues: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useSellerPaymentMethods>);
  });

  it("renders seller name and subtotal", () => {
    render(<SellerCheckoutCard {...defaultProps} />);
    expect(screen.getByText("Test Seller")).toBeInTheDocument();
    expect(screen.getByText(/10,000 COP/)).toBeInTheDocument();
  });

  it("shows item count", () => {
    render(<SellerCheckoutCard {...defaultProps} />);
    expect(screen.getByText(/items:1/)).toBeInTheDocument();
  });

  it("starts expanded", () => {
    render(<SellerCheckoutCard {...defaultProps} />);
    expect(screen.getByTestId("seller-checkout-content")).toBeInTheDocument();
  });

  it("collapses when toggle is clicked", () => {
    render(<SellerCheckoutCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId("seller-checkout-toggle-s1"));
    expect(
      screen.queryByTestId("seller-checkout-content"),
    ).not.toBeInTheDocument();
  });

  it("expands again when toggle is clicked twice", () => {
    render(<SellerCheckoutCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId("seller-checkout-toggle-s1"));
    fireEvent.click(screen.getByTestId("seller-checkout-toggle-s1"));
    expect(screen.getByTestId("seller-checkout-content")).toBeInTheDocument();
  });

  it("has aria-expanded on toggle button", () => {
    render(<SellerCheckoutCard {...defaultProps} />);
    const toggle = screen.getByTestId("seller-checkout-toggle-s1");
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("has the correct wrapper test ID", () => {
    render(<SellerCheckoutCard {...defaultProps} />);
    expect(screen.getByTestId("seller-checkout-s1")).toBeInTheDocument();
  });

  it("passes the stock error state to content when payment info is withheld", () => {
    vi.mocked(useSellerPaymentMethods).mockReturnValue({
      data: {
        methods: [],
        hasStockIssues: true,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useSellerPaymentMethods>);

    render(<SellerCheckoutCard {...defaultProps} />);

    expect(screen.getByTestId("seller-checkout-content")).toHaveAttribute(
      "data-has-stock-issues",
      "true",
    );
    expect(screen.getByTestId("seller-checkout-content")).toHaveAttribute(
      "data-error",
      "stock_error",
    );
  });

  it("does not call onSubmit when hasStockIssues is true", () => {
    vi.mocked(useSellerPaymentMethods).mockReturnValue({
      data: { methods: [makeMethod()], hasStockIssues: true },
      isLoading: false,
    } as unknown as ReturnType<typeof useSellerPaymentMethods>);

    render(<SellerCheckoutCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("trigger-submit"));

    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("sets methodRequired validation error when no method is selected", () => {
    vi.mocked(useSellerPaymentMethods).mockReturnValue({
      data: { methods: [makeMethod()], hasStockIssues: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useSellerPaymentMethods>);

    render(<SellerCheckoutCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("trigger-submit"));

    expect(screen.getByTestId("validation-error")).toHaveTextContent(
      "methodRequired",
    );
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("sets buyerFieldRequired validation error when a required form field is empty", () => {
    const method = makeMethod({
      form_fields: [
        {
          id: "field-1",
          label_en: "Account Number",
          type: "text",
          required: true,
        },
      ],
    });
    vi.mocked(useSellerPaymentMethods).mockReturnValue({
      data: { methods: [method], hasStockIssues: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useSellerPaymentMethods>);

    render(<SellerCheckoutCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("select-first-method"));
    fireEvent.click(screen.getByTestId("trigger-submit"));

    expect(screen.getByTestId("validation-error")).toHaveTextContent(
      "buyerFieldRequired",
    );
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("sets receiptRequired validation error when receipt is missing", () => {
    const method = makeMethod({ requires_receipt: true });
    vi.mocked(useSellerPaymentMethods).mockReturnValue({
      data: { methods: [method], hasStockIssues: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useSellerPaymentMethods>);

    render(<SellerCheckoutCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("select-first-method"));
    fireEvent.click(screen.getByTestId("trigger-submit"));

    expect(screen.getByTestId("validation-error")).toHaveTextContent(
      "receiptRequired",
    );
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("sets transferRequired validation error when transfer number is missing", () => {
    const method = makeMethod({ requires_transfer_number: true });
    vi.mocked(useSellerPaymentMethods).mockReturnValue({
      data: { methods: [method], hasStockIssues: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useSellerPaymentMethods>);

    render(<SellerCheckoutCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("select-first-method"));
    fireEvent.click(screen.getByTestId("trigger-submit"));

    expect(screen.getByTestId("validation-error")).toHaveTextContent(
      "transferRequired",
    );
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with correct params when all validations pass", () => {
    const method = makeMethod();
    vi.mocked(useSellerPaymentMethods).mockReturnValue({
      data: { methods: [method], hasStockIssues: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useSellerPaymentMethods>);

    render(<SellerCheckoutCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("select-first-method"));
    fireEvent.click(screen.getByTestId("trigger-submit"));

    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      paymentMethodId: "pm-1",
      buyerSubmission: {},
      receiptFile: null,
      transferNumber: null,
    });
    expect(screen.getByTestId("validation-error")).toHaveTextContent("");
  });

  it("calls onSubmit with receipt and transfer when provided", () => {
    const method = makeMethod({
      requires_receipt: true,
      requires_transfer_number: true,
    });
    vi.mocked(useSellerPaymentMethods).mockReturnValue({
      data: { methods: [method], hasStockIssues: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useSellerPaymentMethods>);

    render(<SellerCheckoutCard {...defaultProps} />);
    fireEvent.click(screen.getByTestId("select-first-method"));
    fireEvent.click(screen.getByTestId("set-receipt"));
    fireEvent.click(screen.getByTestId("set-transfer"));
    fireEvent.click(screen.getByTestId("trigger-submit"));

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethodId: "pm-1",
        transferNumber: "TX-123",
        receiptFile: expect.any(File),
      }),
    );
  });
});
