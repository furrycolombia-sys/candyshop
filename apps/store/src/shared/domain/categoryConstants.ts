import type { ProductCategory } from "@/shared/domain/categoryTypes";

/** Color theme for each product category; used by both products and cart features. */
export interface CategoryTheme {
  bg: string;
  bgLight: string;
  border: string;
  text: string;
  badgeBg: string;
  rowEven: string;
  rowOdd: string;
  foreground: string;
  accent: string;
}

const TINT_LIGHT = 15;
const TINT_SUBTLE = 5;
const DEFAULT_CATEGORY_FOREGROUND = "--candy-text";
const LEMON_CATEGORY_FOREGROUND = "--candy-text-on-lemon";

/* eslint-disable i18next/no-literal-string -- CSS value helper, not user-facing copy */
function tintedColor(accent: string, percent: number): string {
  return `color-mix(in srgb, var(${accent}) ${String(percent)}%, transparent)`;
}
/* eslint-enable i18next/no-literal-string */

function buildTheme(
  accent: `--${string}`,
  foreground: `--${string}` = "--foreground",
): CategoryTheme {
  return {
    bg: `var(${accent})`,
    bgLight: tintedColor(accent, TINT_LIGHT),
    border: `var(${accent})`,
    text: `var(${accent})`,
    badgeBg: `var(${accent})`,
    rowEven: tintedColor(accent, TINT_SUBTLE),
    rowOdd: tintedColor(accent, TINT_LIGHT),
    foreground: `var(${foreground})`,
    accent,
  };
}

export const CATEGORY_THEMES: Record<ProductCategory, CategoryTheme> = {
  fursuits: buildTheme("--pink", DEFAULT_CATEGORY_FOREGROUND),
  merch: buildTheme("--mint", DEFAULT_CATEGORY_FOREGROUND),
  art: buildTheme("--lilac", DEFAULT_CATEGORY_FOREGROUND),
  events: buildTheme("--lemon", LEMON_CATEGORY_FOREGROUND),
  digital: buildTheme("--sky", DEFAULT_CATEGORY_FOREGROUND),
  deals: buildTheme("--peach", DEFAULT_CATEGORY_FOREGROUND),
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
  return CATEGORY_THEMES[category] ?? CATEGORY_THEMES.merch;
}

/** Get category color by value; used by ProductCard and CartDrawer. */
export function getCategoryColor(category: string): string {
  const found = PRODUCT_CATEGORIES.find((c) => c.value === category);
  return found?.color ?? CATEGORY_THEMES.merch.bg;
}
