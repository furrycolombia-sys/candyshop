"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import { ProductCard } from "./ProductCard";

import type { Product } from "@/features/products/domain/types";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const t = useTranslations("products");

  if (products.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 gap-3"
        {...tid("product-grid-empty")}
      >
        <p className="font-display text-2xl font-extrabold uppercase tracking-tight">
          {t("noResults")}
        </p>
        <p className="text-sm text-muted-foreground">{t("noResultsHint")}</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      {...tid("product-grid")}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
