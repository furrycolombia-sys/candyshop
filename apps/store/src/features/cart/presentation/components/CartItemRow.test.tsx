import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { CartItem } from "@/features/cart/domain/types";
import { CartItemRow } from "@/features/cart/presentation/components/CartItemRow";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="next-image" />
  ),
}));

vi.mock("@/shared/domain/categoryConstants", () => ({
  getCategoryColor: () => "var(--pink)",
  getCategoryTheme: () => ({
    bg: "var(--pink)",
    bgLight: "color-mix(in srgb, var(--pink) 15%, transparent)",
    border: "var(--pink)",
    text: "var(--pink)",
    badgeBg: "var(--pink)",
    rowEven: "color-mix(in srgb, var(--pink) 5%, transparent)",
    rowOdd: "color-mix(in srgb, var(--pink) 15%, transparent)",
    foreground: "var(--candy-text)",
    accent: "--pink",
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "item-1",
    slug: "test-item",
    name_en: "Test Item",
    name_es: "Articulo de prueba",
    description_en: "",
    description_es: "",
    type: "merch",
    category: "merch",
    price_cop: 100_000,
    price_usd: 25,
    max_quantity: null,
    is_active: true,
    created_at: "2025-01-01",
    event_id: null,
    long_description_en: "",
    long_description_es: "",
    tagline_en: "",
    tagline_es: "",
    compare_at_price_cop: null,
    compare_at_price_usd: null,
    tags: [],
    rating: null,
    review_count: 0,
    images: [],
    sections: [],
    updated_at: "2025-01-01",
    featured: false,
    seller_id: null,
    refundable: null,
    sort_order: 0,
    quantity: 2,
    ...overrides,
  } as CartItem;
}

const identity = (...args: unknown[]) => String(args[0]);
const translators = {
  t: identity,
  tProducts: identity,
  tTypes: identity,
  tCategories: identity,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CartItemRow", () => {
  const mockRemoveItem = vi.fn();
  const mockUpdateQuantity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the item name", () => {
    render(
      <CartItemRow
        item={makeCartItem()}
        locale="en"
        translators={translators}
        removeItem={mockRemoveItem}
        updateQuantity={mockUpdateQuantity}
      />,
    );
    expect(screen.getByTestId("cart-item-name")).toHaveTextContent("Test Item");
  });

  it("renders quantity", () => {
    render(
      <CartItemRow
        item={makeCartItem({ quantity: 3 })}
        locale="en"
        translators={translators}
        removeItem={mockRemoveItem}
        updateQuantity={mockUpdateQuantity}
      />,
    );
    expect(screen.getByTestId("cart-item-qty")).toHaveTextContent("3");
  });

  it("calls removeItem when remove button is clicked", () => {
    render(
      <CartItemRow
        item={makeCartItem({ id: "abc" })}
        locale="en"
        translators={translators}
        removeItem={mockRemoveItem}
        updateQuantity={mockUpdateQuantity}
      />,
    );
    fireEvent.click(screen.getByTestId("cart-item-remove"));
    expect(mockRemoveItem).toHaveBeenCalledWith("abc");
  });

  it("calls updateQuantity with incremented value on increase click", () => {
    render(
      <CartItemRow
        item={makeCartItem({ id: "abc", quantity: 2 })}
        locale="en"
        translators={translators}
        removeItem={mockRemoveItem}
        updateQuantity={mockUpdateQuantity}
      />,
    );
    fireEvent.click(screen.getByTestId("cart-item-qty-increase"));
    expect(mockUpdateQuantity).toHaveBeenCalledWith("abc", 3);
  });

  it("disables quantity increase when the cart item already reached the stock limit", () => {
    render(
      <CartItemRow
        item={makeCartItem({ id: "abc", quantity: 2, max_quantity: 2 })}
        locale="en"
        translators={translators}
        removeItem={mockRemoveItem}
        updateQuantity={mockUpdateQuantity}
      />,
    );

    expect(screen.getByTestId("cart-item-qty-increase")).toBeDisabled();
  });

  it("calls updateQuantity with decremented value on decrease click", () => {
    render(
      <CartItemRow
        item={makeCartItem({ id: "abc", quantity: 2 })}
        locale="en"
        translators={translators}
        removeItem={mockRemoveItem}
        updateQuantity={mockUpdateQuantity}
      />,
    );
    fireEvent.click(screen.getByTestId("cart-item-qty-decrease"));
    expect(mockUpdateQuantity).toHaveBeenCalledWith("abc", 1);
  });

  it("renders category and type badges", () => {
    render(
      <CartItemRow
        item={makeCartItem({ category: "fursuits", type: "digital" })}
        locale="en"
        translators={translators}
        removeItem={mockRemoveItem}
        updateQuantity={mockUpdateQuantity}
      />,
    );
    expect(screen.getByText("fursuits")).toBeInTheDocument();
    // "digital" appears in both the type badge and the image fallback label
    expect(screen.getAllByText("digital").length).toBeGreaterThanOrEqual(1);
  });

  it("renders refundable badge when refundable is true", () => {
    render(
      <CartItemRow
        item={makeCartItem({ refundable: true })}
        locale="en"
        translators={translators}
        removeItem={mockRemoveItem}
        updateQuantity={mockUpdateQuantity}
      />,
    );
    expect(screen.getByText("refundable")).toBeInTheDocument();
  });

  it("renders non-refundable badge when refundable is false", () => {
    render(
      <CartItemRow
        item={makeCartItem({ refundable: false })}
        locale="en"
        translators={translators}
        removeItem={mockRemoveItem}
        updateQuantity={mockUpdateQuantity}
      />,
    );
    expect(screen.getByText("nonRefundable")).toBeInTheDocument();
  });

  it("renders image when images array has url entries", () => {
    render(
      <CartItemRow
        item={makeCartItem({
          images: [
            { url: "https://example.com/img.jpg", alt: "test" },
          ] as unknown as CartItem["images"],
        })}
        locale="en"
        translators={translators}
        removeItem={mockRemoveItem}
        updateQuantity={mockUpdateQuantity}
      />,
    );
    expect(screen.getByTestId("next-image")).toBeInTheDocument();
  });
});
