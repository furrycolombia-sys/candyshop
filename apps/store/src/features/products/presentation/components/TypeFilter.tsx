"use client";

import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { tid } from "shared";

import { PRODUCT_TYPES } from "@/features/products/domain/constants";
import { catalogSearchParams } from "@/features/products/domain/searchParams";
import type { ProductType } from "@/features/products/domain/types";

const TAB_BASE =
  "border-2 border-foreground px-4 py-1.5 text-sm font-bold transition-colors";
const TAB_ACTIVE = "bg-foreground text-background z-10";
const TAB_INACTIVE = "bg-background text-foreground hover:bg-foreground/10";

export function TypeFilter() {
  const t = useTranslations("products");
  const tTypes = useTranslations("productTypes");
  const [type, setType] = useQueryState("type", catalogSearchParams.type);

  function handleSelect(value: ProductType | "") {
    void setType(value === "" ? null : value, { history: "push" });
  }

  return (
    <div
      className="flex flex-wrap gap-0"
      role="tablist"
      aria-label={t("type")}
      {...tid("type-filter")}
    >
      <button
        role="tab"
        aria-selected={type === ""}
        className={`${TAB_BASE} ${type === "" ? TAB_ACTIVE : TAB_INACTIVE}`}
        onClick={() => handleSelect("")}
        {...tid("type-filter-all")}
      >
        {t("allTypes")}
      </button>

      {PRODUCT_TYPES.map(({ value }) => {
        const isActive = type === value;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            className={`${TAB_BASE} -ml-[2px] ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`}
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
