import type { ProductCategory, ProductType } from "shared/types";

export const PRODUCT_TYPES: ProductType[] = [
  "merch",
  "digital",
  "service",
  "ticket",
];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "fursuits",
  "merch",
  "art",
  "events",
  "digital",
  "deals",
];

/**
 * Category color mapping using candy CSS variables.
 * Used for badge accents in the product table.
 */
export const CATEGORY_COLOR_MAP: Record<ProductCategory, string> = {
  fursuits: "bg-pink/15 text-pink",
  merch: "bg-mint/15 text-mint",
  art: "bg-lilac/15 text-lilac",
  events: "bg-lemon/15 text-candy-text",
  digital: "bg-sky/15 text-sky",
  deals: "bg-peach/15 text-peach",
};

/** Type color mapping */
export const TYPE_COLOR_MAP: Record<ProductType, string> = {
  merch: "bg-mint/15 text-mint",
  digital: "bg-sky/15 text-sky",
  service: "bg-lilac/15 text-lilac",
  ticket: "bg-peach/15 text-peach",
};
