import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useSellerPaymentMethods } from "@/features/checkout/application/hooks/useSellerPaymentMethods";
import type { CartItem } from "@/features/checkout/domain/types";

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

vi.mock("./SellerCheckoutContent", () => ({
  SellerCheckoutContent: ({
    submission,
  }: {
    submission: { hasStockIssues: boolean; error: string | null };
  }) => (
    <div
      data-testid="seller-checkout-content"
      data-has-stock-issues={String(submission.hasStockIssues)}
      data-error={submission.error ?? ""}
    >
      Content
    </div>
  ),
}));

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { SellerCheckoutCard } from "./SellerCheckoutCard";

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
});
