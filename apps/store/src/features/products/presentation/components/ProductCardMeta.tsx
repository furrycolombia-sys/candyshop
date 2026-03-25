"use client";

import { useTranslations } from "next-intl";

import type { Product } from "@/features/products/domain/types";

interface ProductCardMetaProps {
  product: Product;
}

/**
 * Renders type-specific metadata label for product cards.
 * Note: detailed type metadata (slots, tickets, etc.) now lives in product sections.
 * This component shows a simple type label for the card grid.
 */
export function ProductCardMeta({ product }: ProductCardMetaProps) {
  const t = useTranslations("products");

  const stockLabel = (() => {
    if (product.max_quantity === null) return null;
    if (product.max_quantity === 0) return t("outOfStock");
    return t("stockLeft", { count: product.max_quantity });
  })();

  return (
    <>
      {product.type === "digital" && <p>{t("digital")}</p>}
      {stockLabel && <p>{stockLabel}</p>}
    </>
  );
}
