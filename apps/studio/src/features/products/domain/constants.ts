import type { ProductCategory, ProductType } from "shared/types";

import type { ProductFormValues } from "./validationSchema";

/** Shared React Query key for products — used across all hooks */
export const PRODUCTS_QUERY_KEY = "products";

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
