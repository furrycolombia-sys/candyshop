import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ProductDetailPage } from "./ProductDetailPage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/shared/infrastructure/i18n", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

let mockLoading = false;
let mockError = false;
let mockProduct: unknown = null;

vi.mock("@/features/products/application/useStoreProducts", () => ({
  useStoreProduct: () => ({
    data: mockProduct,
    isLoading: mockLoading,
    isError: mockError,
  }),
}));

vi.mock("@/features/cart/presentation/components/CartDrawer", () => ({
  CartDrawer: () => <div data-testid="cart-drawer-mock" />,
}));

vi.mock(
  "@/features/products/presentation/components/product-detail/MobileBarWithCart",
  () => ({
    MobileBarWithCart: () => <div data-testid="mobile-bar-mock" />,
  }),
);

vi.mock(
  "@/features/products/presentation/components/product-detail/ProductSections",
  () => ({
    ProductSections: () => <div data-testid="product-sections-mock" />,
  }),
);

vi.mock("@/shared/domain/categoryConstants", () => ({
  getCategoryTheme: () => ({
    bg: "bg-mint",
    bgLight: "bg-mint/15",
    border: "border-mint",
    text: "text-mint",
    badgeBg: "bg-mint",
    rowEven: "bg-mint/5",
    rowOdd: "bg-mint/15",
    accent: "--mint",
  }),
}));

describe("ProductDetailPage", () => {
  it("renders loading state", () => {
    mockLoading = true;
    mockError = false;
    mockProduct = null;
    render(<ProductDetailPage productId="p1" />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("renders error state when error", () => {
    mockLoading = false;
    mockError = true;
    mockProduct = null;
    render(<ProductDetailPage productId="p1" />);
    expect(screen.getByText("loadError")).toBeInTheDocument();
  });

  it("renders error state when no product", () => {
    mockLoading = false;
    mockError = false;
    mockProduct = null;
    render(<ProductDetailPage productId="p1" />);
    expect(screen.getByText("loadError")).toBeInTheDocument();
  });

  it("renders product detail with data", () => {
    mockLoading = false;
    mockError = false;
    mockProduct = {
      id: "p1",
      slug: "test",
      name_en: "Test",
      category: "merch",
      type: "merch",
    };
    render(<ProductDetailPage productId="p1" />);
    expect(screen.getByTestId("product-detail-page")).toBeInTheDocument();
    expect(screen.getByTestId("product-sections-mock")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-bar-mock")).toBeInTheDocument();
    expect(screen.getByTestId("cart-drawer-mock")).toBeInTheDocument();
  });

  it("renders back link", () => {
    mockLoading = false;
    mockError = false;
    mockProduct = { id: "p1", slug: "test", category: "merch", type: "merch" };
    render(<ProductDetailPage productId="p1" />);
    expect(screen.getByTestId("product-detail-back")).toBeInTheDocument();
  });
});
