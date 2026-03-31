"use client";

import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { tid } from "shared";
import { cn } from "ui";

import { PRODUCT_TYPES } from "@/features/products/domain/constants";
import { catalogSearchParams } from "@/features/products/domain/searchParams";
import type { ProductType } from "@/features/products/domain/types";

export function TypeFilter() {
  const t = useTranslations("products");
  const tTypes = useTranslations("productTypes");
  const [type, setType] = useQueryState("type", catalogSearchParams.type);

  function handleSelect(value: ProductType | "") {
    void setType(value === "" ? null : value, { history: "push" });
  }

  const getTabClass = (isActive: boolean, withOverlap = false) =>
    cn(
      "border-2 border-foreground px-4 py-1.5 text-sm font-bold transition-colors",
      withOverlap && "-ml-0.5",
      isActive
        ? "z-10 bg-foreground text-background"
        : "bg-background text-foreground hover:bg-foreground/10",
    );

  return (
    <div
      className="flex flex-wrap gap-0"
      role="tablist"
      aria-label={t("type")}
      {...tid("type-filter")}
    >
      <button
        type="button"
        role="tab"
        aria-selected={type === ""}
        className={getTabClass(type === "")}
        onClick={() => handleSelect("")}
        {...tid("type-filter-all")}
      >
        {t("allTypes")}
      </button>

      {PRODUCT_TYPES.map(({ value }) => {
        const isActive = type === value;
        return (
          <button
            type="button"
            key={value}
            role="tab"
            aria-selected={isActive}
            className={getTabClass(isActive, true)}
            onClick={() => handleSelect(value)}
            {...tid(`type-filter-${value}`)}
          >
            {tTypes(value)}
          </button>
        );
      })}
    </div>
  );
}
