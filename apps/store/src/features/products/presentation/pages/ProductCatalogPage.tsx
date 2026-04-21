"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useMemo } from "react";
import { i18nField, tid } from "shared";

import { useStoreProducts } from "@/features/products/application/hooks/useStoreProducts";
import { catalogSearchParams } from "@/features/products/domain/searchParams";
import { ProductFilters } from "@/features/products/presentation/components/ProductFilters";
import { ProductGrid } from "@/features/products/presentation/components/ProductGrid";
import type {
  ProductCategory,
  ProductType,
} from "@/shared/domain/CategoryTypes";

/* eslint-disable sonarjs/no-duplicate-string -- Tailwind class strings are not DRY violations */
export function ProductCatalogPage() {
  const t = useTranslations("products");
  const locale = useLocale();
  const [{ category, type, q }] = useQueryStates(catalogSearchParams);
  const { data: products, isLoading, isError } = useStoreProducts();

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((product) => {
      if (
        category !== "" &&
        product.category !== (category as ProductCategory)
      ) {
        return false;
      }
      if (type !== "" && product.type !== (type as ProductType)) {
        return false;
      }
      if (q.trim() !== "") {
        const query = q.trim().toLowerCase();
        const name = i18nField(product, "name", locale).toLowerCase();
        const description = i18nField(
          product,
          "description",
          locale,
        ).toLowerCase();
        return name.includes(query) || description.includes(query);
      }
      return true;
    });
  }, [products, category, type, q, locale]);

  if (isLoading) {
    return (
      <main
        className="flex flex-1 flex-col surface-grid-dots"
        {...tid("product-catalog-page")}
      >
        <div className="mx-auto flex min-h-app-pane w-full max-w-7xl flex-col items-center justify-center gap-4 px-4 py-8">
          <div className="size-8 border-strong border-foreground border-t-transparent rounded-full animate-spin" />
          <p className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {t("loading")}
          </p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main
        className="flex flex-1 flex-col surface-grid-dots"
        {...tid("product-catalog-page")}
      >
        <div className="mx-auto flex min-h-app-pane w-full max-w-7xl flex-col items-center justify-center gap-4 px-4 py-8">
          <p className="font-display text-lg font-extrabold uppercase tracking-tight text-destructive">
            {t("loadError")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex flex-1 flex-col surface-grid-dots"
      {...tid("product-catalog-page")}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-8 flex flex-col gap-6">
        {/* Page header */}
        <header>
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("product-catalog-title")}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        {/* Filters: search + type + category */}
        <ProductFilters />

        {/* Product grid */}
        <ProductGrid products={filteredProducts} />
      </div>
    </main>
  );
}
