import type { ProductCategory } from "shared/types";

/** Color theme for each product category — mirrors store's CategoryTheme */
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

export function getCategoryTheme(category: ProductCategory): CategoryTheme {
  return CATEGORY_THEMES[category] ?? CATEGORY_THEMES.merch;
}

/** Category → hero background color mapping (dimmed 15% opacity) */
export const CATEGORY_HERO_BG: Record<ProductCategory, string> = {
  fursuits: "bg-pink/15",
  merch: "bg-mint/15",
  art: "bg-lilac/15",
  events: "bg-lemon/15",
  digital: "bg-sky/15",
  deals: "bg-peach/15",
};

/** Category badge style mapping for neobrutalist badges */
export const CATEGORY_BADGE_STYLES: Record<ProductCategory, string> = {
  fursuits: "bg-pink/15 text-pink border-pink/30",
  merch: "bg-mint/15 text-mint border-mint/30",
  art: "bg-lilac/15 text-lilac border-lilac/30",
  events: "bg-lemon/15 text-candy-text border-lemon/30",
  digital: "bg-sky/15 text-sky border-sky/30",
  deals: "bg-peach/15 text-peach border-peach/30",
};

export function getCategoryBadgeStyle(category: ProductCategory): string {
  return CATEGORY_BADGE_STYLES[category] ?? CATEGORY_BADGE_STYLES.merch;
}
