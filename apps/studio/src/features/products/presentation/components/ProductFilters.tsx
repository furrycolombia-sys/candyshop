"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { tid } from "shared";
import { cn, Input } from "ui";

import {
  PRODUCT_CATEGORIES,
  PRODUCT_TYPES,
} from "@/features/products/domain/constants";
import { productsSearchParams } from "@/features/products/domain/searchParams";

const DEBOUNCE_MS = 300;
const PILL_BASE =
  "nb-btn rounded-full border-2 px-4 py-1.5 text-sm transition-all";
const PILL_ACTIVE = "bg-foreground text-background nb-shadow-sm";
const PILL_INACTIVE = "bg-background hover:bg-muted";
const I18N_ALL = "common.all";

export function ProductFilters() {
  const t = useTranslations();
  const [{ type, category, q }, setParams] =
    useQueryStates(productsSearchParams);

  const [searchInput, setSearchInput] = useState(q);

  // Debounce search input to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams({ q: searchInput || null }, { history: "replace" });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, setParams]);

  // Sync external URL changes back to local state
  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const handleTypeChange = useCallback(
    (value: string) => {
      setParams({ type: value || null }, { history: "push" });
    },
    [setParams],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      setParams({ category: value || null }, { history: "push" });
    },
    [setParams],
  );

  return (
    <div className="flex flex-col gap-4" {...tid("product-filters")}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("common.search")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="border-3 border-border bg-background text-foreground pl-10 font-medium"
          {...tid("product-search")}
        />
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2" {...tid("type-filters")}>
        <button
          onClick={() => handleTypeChange("")}
          className={cn(PILL_BASE, type === "" ? PILL_ACTIVE : PILL_INACTIVE)}
          {...tid("type-filter-all")}
        >
          {t(I18N_ALL)}
        </button>
        {PRODUCT_TYPES.map((pt) => (
          <button
            key={pt}
            onClick={() => handleTypeChange(pt)}
            className={cn(PILL_BASE, type === pt ? PILL_ACTIVE : PILL_INACTIVE)}
            {...tid(`type-filter-${pt}`)}
          >
            {t(`productTypes.${pt}`)}
          </button>
        ))}
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2" {...tid("category-filters")}>
        <button
          onClick={() => handleCategoryChange("")}
          className={cn(
            PILL_BASE,
            category === "" ? PILL_ACTIVE : PILL_INACTIVE,
          )}
          {...tid("category-filter-all")}
        >
          {t(I18N_ALL)}
        </button>
        {PRODUCT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={cn(
              PILL_BASE,
              category === cat ? PILL_ACTIVE : PILL_INACTIVE,
            )}
            {...tid(`category-filter-${cat}`)}
          >
            {t(`categories.${cat}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
