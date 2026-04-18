import type { ProductCategory, ProductType } from "shared/types";

import type { ProductFormValues } from "./validationSchema";

/** Shared React Query key for products — used across all hooks */
export const PRODUCTS_QUERY_KEY = "products";

/** React Query key for product templates */
export const TEMPLATES_QUERY_KEY = "product-templates";

/** Debounce delay for product search/filter inputs (ms) */
export const PRODUCT_SEARCH_DEBOUNCE_MS = 300;

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

export interface BadgeTone {
  backgroundColor: string;
  color: string;
}

const BADGE_TINT = 15;
const DEFAULT_BADGE_FOREGROUND = "--foreground";
const LEMON_BADGE_FOREGROUND = "--candy-text-on-lemon";

/* eslint-disable i18next/no-literal-string -- CSS value helper, not user-facing copy */
function badgeTone(
  accent: `--${string}`,
  foreground: `--${string}` = DEFAULT_BADGE_FOREGROUND,
): BadgeTone {
  return {
    backgroundColor: `color-mix(in srgb, var(${accent}) ${String(BADGE_TINT)}%, transparent)`,
    color: `var(${foreground})`,
  };
}
/* eslint-enable i18next/no-literal-string */

/**
 * Category color mapping using candy CSS variables.
 * Used for badge accents in the product table.
 */
export const CATEGORY_COLOR_MAP: Record<ProductCategory, BadgeTone> = {
  fursuits: badgeTone("--pink"),
  merch: badgeTone("--mint"),
  art: badgeTone("--lilac"),
  events: badgeTone("--lemon", LEMON_BADGE_FOREGROUND),
  digital: badgeTone("--sky"),
  deals: badgeTone("--peach"),
};

/** Type color mapping */
export const TYPE_COLOR_MAP: Record<ProductType, BadgeTone> = {
  merch: badgeTone("--mint"),
  digital: badgeTone("--sky"),
  service: badgeTone("--lilac"),
  ticket: badgeTone("--peach"),
};

/** Shared i18n namespace for section editors */
export const SECTION_I18N_NAMESPACE = "form.inlineEditor.sections";

/** Droppable ID for the sections list (used by DnD) */
export const SECTION_DROPPABLE_ID = "sections";

/** Droppable ID prefix for section items (used by DnD) */
export const ITEM_DROPPABLE_PREFIX = "section-items-";

/** Supported editor languages */
export type Lang = "en" | "es";

/** Default values for the product form */
export const PRODUCT_FORM_DEFAULTS: ProductFormValues = {
  name_en: "",
  name_es: "",
  description_en: "",
  description_es: "",
  tagline_en: "",
  tagline_es: "",
  long_description_en: "",
  long_description_es: "",
  type: "merch",
  category: "merch",
  price_cop: 0,
  price_usd: "",
  compare_at_price_cop: null,
  compare_at_price_usd: null,
  tags: "",
  featured: false,
  is_active: true,
  images: [],
  sections: [],
  max_quantity: null,
  refundable: null,
};
