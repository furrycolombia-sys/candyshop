import type { ProductCategory } from "shared/types";

/** Category color mapping using candy CSS variables — neobrutalist badges */
export const CATEGORY_BADGE_STYLES: Record<ProductCategory, string> = {
  fursuits: "bg-(--pink)/15 text-(--pink) border-(--pink)/30",
  merch: "bg-(--mint)/15 text-(--mint) border-(--mint)/30",
  art: "bg-(--lilac)/15 text-(--lilac) border-(--lilac)/30",
  events: "bg-(--lemon)/15 text-(--candy-text-on-lemon) border-(--lemon)/30",
  digital: "bg-(--sky)/15 text-(--sky) border-(--sky)/30",
  deals: "bg-(--peach)/15 text-(--peach) border-(--peach)/30",
};

export function getCategoryBadgeStyle(category: ProductCategory): string {
  return CATEGORY_BADGE_STYLES[category] ?? CATEGORY_BADGE_STYLES.merch;
}
