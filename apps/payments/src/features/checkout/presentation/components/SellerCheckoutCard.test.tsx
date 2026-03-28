import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { CartItem } from "@/features/checkout/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  },
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/shared/application/utils/formatCop", () => ({
  formatCop: (amount: number) => `$${amount.toLocaleString()} COP`,
}));

vi.mock(
  "@/features/checkout/application/hooks/useSellerPaymentMethods",
  () => ({
    useSellerPaymentMethods: () => ({
      data: [],
      isLoading: false,
    }),
  }),
);

vi.mock("./SellerCheckoutContent", () => ({
  SellerCheckoutContent: () => (
    <div data-testid="seller-checkout-content">Content</div>
  ),
}));

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { SellerCheckoutCard } from "./SellerCheckoutCard";

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

describe("SellerCheckoutCard", () => {
  const defaultProps = {
    sellerId: "s1",
    sellerName: "Test Seller",
    items: mockItems,
    subtotalCop: 10_000,
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
    expect(screen.getByText(/\$10,000 COP/)).toBeInTheDocument();
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
});
