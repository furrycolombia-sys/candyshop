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

  if (product.type === "digital") {
    return <p>{t("digital")}</p>;
  }

  return null;
}
