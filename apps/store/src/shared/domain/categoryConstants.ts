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

/** Build a complete theme from a single CSS variable name */
function buildTheme(cssVar: string): CategoryTheme {
  const bg = `bg-(${cssVar})`;
  return {
    bg,
    bgLight: `${bg}/15`,
    border: `border-(${cssVar})`,
    text: `text-(${cssVar})`,
    badgeBg: bg,
    rowEven: `${bg}/5`,
    rowOdd: `${bg}/15`,
    accent: cssVar,
  };
}

export const CATEGORY_THEMES: Record<ProductCategory, CategoryTheme> = {
  fursuits: buildTheme("--pink"),
  merch: buildTheme("--mint"),
  art: buildTheme("--lilac"),
  events: buildTheme("--lemon"),
  digital: buildTheme("--sky"),
  deals: buildTheme("--peach"),
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
