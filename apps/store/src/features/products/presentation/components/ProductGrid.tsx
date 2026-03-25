"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { tid } from "shared";

import { ProductCard } from "./ProductCard";

import { buildGridOrder } from "@/features/products/application/buildGridOrder";
import { useGridCols } from "@/features/products/application/useGridCols";
import type { Product } from "@/features/products/domain/types";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const t = useTranslations("products");
  const cols = useGridCols();

  // Recomputes when products change OR the breakpoint changes
  const orderedProducts = useMemo(
    () => buildGridOrder(products, cols),
    [products, cols],
  );

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
      {orderedProducts.map((product) => {
        if (product.featured) {
          return (
            <div key={product.id} className="col-span-full">
              <ProductCard product={product} variant="featured" />
            </div>
          );
        }

        return <ProductCard key={product.id} product={product} />;
      })}
    </div>
  );
}
