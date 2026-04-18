import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CartDrawer } from "./CartDrawer";
// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockRemoveItem = vi.fn();
const mockUpdateQuantity = vi.fn();
const mockClearCart = vi.fn();
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
  useSupabase: () => ({}),
}));
vi.mock("ui", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet">{children}</div>
  ),
  SheetTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div data-testid="sheet-trigger">{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
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
    items: [],
    total: 0,
    itemCount: 0,
    removeItem: mockRemoveItem,
    updateQuantity: mockUpdateQuantity,
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
  groupCartBySeller: () => [],
}));
vi.mock("@/features/cart/application/hooks/useSellerProfiles", () => ({
  useSellerProfiles: () => ({ data: null }),
}));
vi.mock("@/shared/infrastructure/config", () => ({
  appUrls: { payments: "http://localhost:5005" },
}));
describe("CartDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("renders trigger button", () => {
    render(<CartDrawer />);
    expect(screen.getByTestId("cart-drawer-trigger")).toBeInTheDocument();
  });
  it("renders empty state when no items", () => {
    render(<CartDrawer />);
    expect(screen.getByTestId("cart-drawer-empty")).toBeInTheDocument();
  });
});
