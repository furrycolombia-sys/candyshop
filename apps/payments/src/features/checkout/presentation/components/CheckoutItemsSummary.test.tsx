import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import type { CartItem } from "@/features/checkout/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import { CheckoutItemsSummary } from "./CheckoutItemsSummary";

const mockItems: CartItem[] = [
  {
    id: "p1",
    name_en: "Widget",
    name_es: "Widget ES",
    price_cop: 5000,
    price_usd: 1.5,
    seller_id: "s1",
    quantity: 2,
    images: [{ url: "https://example.com/img.jpg", alt: "Widget image" }],
    max_quantity: 10,
  },
  {
    id: "p2",
    name_en: "Gadget",
    name_es: "Gadget ES",
    price_cop: 3000,
    price_usd: 1,
    seller_id: "s1",
    quantity: 1,
    images: [],
    max_quantity: null,
  },
];

describe("CheckoutItemsSummary", () => {
  const getItemName = (item: CartItem) => item.name_en;

  it("renders all items with names", () => {
    render(
      <CheckoutItemsSummary
        items={mockItems}
        subtotalCop={13_000}
        getItemName={getItemName}
      />,
    );

    expect(screen.getByText(/Widget/)).toBeInTheDocument();
    expect(screen.getByText(/Gadget/)).toBeInTheDocument();
  });

  it("shows quantity for each item", () => {
    render(
      <CheckoutItemsSummary
        items={mockItems}
        subtotalCop={13_000}
        getItemName={getItemName}
      />,
    );

    expect(screen.getByText("x2")).toBeInTheDocument();
    expect(screen.getByText("x1")).toBeInTheDocument();
  });

  it("renders the subtotal", () => {
    render(
      <CheckoutItemsSummary
        items={mockItems}
        subtotalCop={13_000}
        getItemName={getItemName}
      />,
    );

    expect(screen.getByTestId("checkout-subtotal")).toBeInTheDocument();
    expect(screen.getByText("subtotal")).toBeInTheDocument();
  });

  it("renders product images when available", () => {
    render(
      <CheckoutItemsSummary
        items={mockItems}
        subtotalCop={13_000}
        getItemName={getItemName}
      />,
    );

    const img = screen.getByAltText("Widget image");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/img.jpg");
  });

  it("has the correct test ID", () => {
    render(
      <CheckoutItemsSummary
        items={mockItems}
        subtotalCop={13_000}
        getItemName={getItemName}
      />,
    );

    expect(screen.getByTestId("checkout-items-summary")).toBeInTheDocument();
  });
});
