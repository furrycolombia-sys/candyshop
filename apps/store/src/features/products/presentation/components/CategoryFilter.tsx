"use client";

import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { tid } from "shared";

import { PRODUCT_CATEGORIES } from "@/features/products/domain/constants";
import { catalogSearchParams } from "@/features/products/domain/searchParams";
import type { ProductCategory } from "@/features/products/domain/types";

const PILL_BASE =
  "border-2 border-foreground px-3 py-1 text-sm font-bold transition-colors";
const PILL_INACTIVE = "bg-background text-foreground hover:bg-foreground/10";

export function CategoryFilter() {
  const t = useTranslations("products");
  const tCategories = useTranslations("categories");
  const [category, setCategory] = useQueryState(
    "category",
    catalogSearchParams.category,
  );

  function handleSelect(value: ProductCategory | "") {
    void setCategory(value === "" ? null : value, { history: "replace" });
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={t("category")}
      {...tid("category-filter")}
    >
      <button
        type="button"
        className={`${PILL_BASE} ${category === "" ? "bg-foreground text-background" : PILL_INACTIVE}`}
        onClick={() => handleSelect("")}
        aria-pressed={category === ""}
        {...tid("category-filter-all")}
      >
        {t("allCategories")}
      </button>

      {PRODUCT_CATEGORIES.map(({ value, color }) => {
        const isActive = category === value;
        const activeClass = `${color} text-foreground`;
        return (
          <button
            type="button"
            key={value}
            className={`${PILL_BASE} ${isActive ? activeClass : PILL_INACTIVE}`}
            onClick={() => handleSelect(value)}
            aria-pressed={isActive}
            {...tid(`category-filter-${value}`)}
          >
            {tCategories(value)}
          </button>
        );
      })}
    </div>
  );
}
