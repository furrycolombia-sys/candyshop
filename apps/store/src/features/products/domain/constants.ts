import type { ProductType } from "@/shared/domain/categoryTypes";

// Re-exported from shared domain — single source of truth
export type { CategoryTheme } from "@/shared/domain/categoryConstants";
export {
  CATEGORY_THEMES,
  PRODUCT_CATEGORIES,
  getCategoryColor,
  getCategoryTheme,
} from "@/shared/domain/categoryConstants";

export const PRODUCT_TYPES: { value: ProductType }[] = [
  { value: "physical" },
  { value: "digital" },
  { value: "commission" },
  { value: "ticket" },
];
