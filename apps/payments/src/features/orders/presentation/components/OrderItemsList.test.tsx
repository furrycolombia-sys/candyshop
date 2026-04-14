import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shared")>();
  return {
    ...actual,
    tid: (id: string) => ({ "data-testid": id }),
  };
});

vi.mock("@/shared/application/utils/formatCop", () => ({
  formatCop: (amount: number) => `$${amount.toLocaleString()} COP`,
}));

import { OrderItemsList } from "./OrderItemsList";

import type { OrderItem } from "@/features/orders/domain/types";

const mockItems: OrderItem[] = [
  {
    id: "oi1",
    product_id: "p1",
    quantity: 2,
    unit_price_cop: 5000,
    metadata: { name_en: "Widget", name_es: "Widget ES" },
  },
  {
    id: "oi2",
    product_id: "p2",
    quantity: 1,
    unit_price_cop: 3000,
    metadata: { name_en: "Gadget" },
  },
];

describe("OrderItemsList", () => {
  it("renders all items", () => {
    render(<OrderItemsList items={mockItems} />);
    expect(screen.getByText(/Widget/)).toBeInTheDocument();
    expect(screen.getByText(/Gadget/)).toBeInTheDocument();
  });

  it("shows quantity for each item", () => {
    render(<OrderItemsList items={mockItems} />);
    expect(screen.getByText("x2")).toBeInTheDocument();
    expect(screen.getByText("x1")).toBeInTheDocument();
  });

  it("shows the formatted total price per item", () => {
    render(<OrderItemsList items={mockItems} />);
    // 5000 * 2 = 10000
    expect(screen.getByText("$10,000 COP")).toBeInTheDocument();
    // 3000 * 1 = 3000
    expect(screen.getByText("$3,000 COP")).toBeInTheDocument();
  });

  it("falls back to product_id when no name in metadata", () => {
    const items: OrderItem[] = [
      {
        id: "oi3",
        product_id: "prod-xyz",
        quantity: 1,
        unit_price_cop: 1000,
        metadata: {},
      },
    ];
    render(<OrderItemsList items={items} />);
    expect(screen.getByText(/prod-xyz/)).toBeInTheDocument();
  });

  it("has the correct test ID", () => {
    render(<OrderItemsList items={mockItems} />);
    expect(screen.getByTestId("order-items-list")).toBeInTheDocument();
  });
});
