"use client";

import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useMemo } from "react";
import { tid } from "shared";

import { CategoryFilter } from "../components/CategoryFilter";
import { ProductGrid } from "../components/ProductGrid";
import { SearchBar } from "../components/SearchBar";
import { TypeFilter } from "../components/TypeFilter";

import { catalogSearchParams } from "@/features/products/domain/searchParams";
import type {
  ProductCategory,
  ProductType,
} from "@/features/products/domain/types";
import { mockProducts } from "@/mocks/data/products";

export function ProductCatalogPage() {
  const t = useTranslations("products");
  const [{ category, type, q }] = useQueryStates(catalogSearchParams);

  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
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
        return (
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [category, type, q]);

  return (
    <main
      className="flex flex-1 flex-col bg-dots"
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

        {/* Search */}
        <SearchBar />

        {/* Category filter pills */}
        <CategoryFilter />

        {/* Type filter tabs */}
        <TypeFilter />

        {/* Product grid */}
        <ProductGrid products={filteredProducts} />
      </div>
    </main>
  );
}
