import type { ProductCategory } from "@/shared/domain/categoryTypes";

/** Color theme for each product category — used by both products and cart features */
export interface CategoryTheme {
  bg: string;
  bgLight: string;
  border: string;
  text: string;
  badgeBg: string;
  rowEven: string;
  rowOdd: string;
  accent: string;
}

/**
 * Build a theme using Tailwind theme color names (registered in theme.css via
 * --color-pink, --color-mint, etc.). Using `bg-pink` instead of `bg-(--pink)`
 * ensures Tailwind v4 JIT can detect and generate the utility classes.
 */
function buildTheme(color: string): CategoryTheme {
  return {
    bg: `bg-${color}`,
    bgLight: `bg-${color}/15`,
    border: `border-${color}`,
    text: `text-${color}`,
    badgeBg: `bg-${color}`,
    rowEven: `bg-${color}/5`,
    rowOdd: `bg-${color}/15`,
    accent: `--${color}`,
  };
}

export const CATEGORY_THEMES: Record<ProductCategory, CategoryTheme> = {
  fursuits: buildTheme("pink"),
  merch: buildTheme("mint"),
  art: buildTheme("lilac"),
  events: buildTheme("lemon"),
  digital: buildTheme("sky"),
  deals: buildTheme("peach"),
};

/** Category list with colors derived from CATEGORY_THEMES (single source of truth) */
export const PRODUCT_CATEGORIES: {
  value: ProductCategory;
  color: string;
}[] = [
  { value: "fursuits", color: CATEGORY_THEMES.fursuits.bg },
  { value: "merch", color: CATEGORY_THEMES.merch.bg },
  { value: "art", color: CATEGORY_THEMES.art.bg },
  { value: "events", color: CATEGORY_THEMES.events.bg },
  { value: "digital", color: CATEGORY_THEMES.digital.bg },
  { value: "deals", color: CATEGORY_THEMES.deals.bg },
];

export function getCategoryTheme(category: ProductCategory): CategoryTheme {
  return CATEGORY_THEMES[category];
}

/** Get category color by value — used by ProductCard and CartDrawer */
export function getCategoryColor(category: string): string {
  const found = PRODUCT_CATEGORIES.find((c) => c.value === category);
  return found?.color ?? CATEGORY_THEMES.merch.bg;
}
