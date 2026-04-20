"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { tid } from "shared";
import { Input, cn } from "ui";

import {
  PRODUCT_CATEGORIES,
  PRODUCT_TYPES,
} from "@/features/products/domain/constants";
import { catalogSearchParams } from "@/features/products/domain/searchParams";

const DEBOUNCE_MS = 300;

const getPillClass = (isActive: boolean) =>
  cn(
    "button-brutal rounded-full border-2 px-4 py-1.5 text-sm transition-all",
    isActive
      ? "bg-foreground text-background shadow-brutal-sm"
      : "bg-background hover:bg-muted",
  );

export function ProductFilters() {
  const t = useTranslations("products");
  const tCategories = useTranslations("categories");
  const tTypes = useTranslations("productTypes");

  const [{ type, category, q }, setParams] =
    useQueryStates(catalogSearchParams);
  const [searchInput, setSearchInput] = useState(q ?? "");

  // Debounce search input to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      void setParams({ q: searchInput || null }, { history: "replace" });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, setParams]);

  // Sync external URL changes (browser back/forward) back to local state
  // Equality guard prevents debounce→URL→sync cycle from overwriting mid-type input
  useEffect(() => {
    if (q !== searchInput) {
      setSearchInput(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const handleTypeChange = useCallback(
    (value: string) => {
      void setParams({ type: value || null }, { history: "push" });
    },
    [setParams],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      void setParams({ category: value || null }, { history: "replace" });
    },
    [setParams],
  );

  return (
    <div className="flex flex-col gap-4" {...tid("product-filters")}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("search")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="border-strong border-foreground pl-10 font-medium"
          {...tid("search-bar-input")}
        />
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2" {...tid("type-filters")}>
        <button
          type="button"
          onClick={() => handleTypeChange("")}
          className={getPillClass(type === "")}
          aria-pressed={type === ""}
          {...tid("type-filter-all")}
        >
          {t("allTypes")}
        </button>
        {PRODUCT_TYPES.map(({ value }) => (
          <button
            type="button"
            key={value}
            onClick={() => handleTypeChange(value)}
            className={getPillClass(type === value)}
            aria-pressed={type === value}
            {...tid(`type-filter-${value}`)}
          >
            {tTypes(value)}
          </button>
        ))}
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2" {...tid("category-filters")}>
        <button
          type="button"
          onClick={() => handleCategoryChange("")}
          className={getPillClass(category === "")}
          aria-pressed={category === ""}
          {...tid("category-filter-all")}
        >
          {t("allCategories")}
        </button>
        {PRODUCT_CATEGORIES.map(({ value }) => (
          <button
            type="button"
            key={value}
            onClick={() => handleCategoryChange(value)}
            className={getPillClass(category === value)}
            aria-pressed={category === value}
            {...tid(`category-filter-${value}`)}
          >
            {tCategories(value)}
          </button>
        ))}
      </div>
    </div>
  );
}
