import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CartDrawer } from "./CartDrawer";

// ---------------------------------------------------------------------------
// Mocks — cart with items
// ---------------------------------------------------------------------------

const mockClearCart = vi.fn();

const cartItems = [
  {
    id: "item-1",
    slug: "item-1",
    name_en: "Product A",
    name_es: "Producto A",
    price_usd: 10,
    price_cop: 40_000,
    quantity: 2,
    category: "merch",
    type: "merch",
    seller_id: "seller-1",
  },
];

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    if (params?.sellerName !== undefined) return `${key}:${params.sellerName}`;
    return key;
  },
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nPrice: (product: Record<string, unknown>) =>
    `$${product.price_usd ?? product.price_cop}`,
}));

vi.mock("ui", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("./CartItemRow", () => ({
  CartItemRow: ({ item }: { item: { id: string } }) => (
    <li data-testid={`cart-item-${item.id}`}>Item</li>
  ),
}));

vi.mock("@/features/cart/application/CartContext", () => ({
  useCart: () => ({
    items: cartItems,
    itemCount: 2,
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: mockClearCart,
  }),
}));

vi.mock("@/features/cart/application/FlyToCartContext", () => ({
  useFlyToCartContext: () => ({
    setCartTarget: vi.fn(),
    fire: vi.fn(),
  }),
}));

vi.mock("@/features/cart/application/groupBySeller", () => ({
  groupCartBySeller: () => [
    { sellerId: "seller-1", items: cartItems, subtotal: 20 },
  ],
}));

vi.mock("@/features/cart/application/useSellerProfiles", () => ({
  useSellerProfiles: () => ({ data: { "seller-1": "Seller One" } }),
}));

vi.mock("@/shared/infrastructure/config", () => ({
  appUrls: { payments: "http://localhost:5005" },
}));

describe("CartDrawer with items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders cart items", () => {
    render(<CartDrawer />);
    expect(screen.getByTestId("cart-drawer-items")).toBeInTheDocument();
    expect(screen.getByTestId("cart-item-item-1")).toBeInTheDocument();
  });

  it("renders checkout link", () => {
    render(<CartDrawer />);
    expect(screen.getByTestId("cart-checkout")).toBeInTheDocument();
  });

  it("calls clearCart when clear button is clicked", () => {
    render(<CartDrawer />);
    fireEvent.click(screen.getByTestId("cart-drawer-clear"));
    expect(mockClearCart).toHaveBeenCalledTimes(1);
  });

  it("renders seller group", () => {
    render(<CartDrawer />);
    expect(screen.getByTestId("cart-seller-group")).toBeInTheDocument();
  });
});
