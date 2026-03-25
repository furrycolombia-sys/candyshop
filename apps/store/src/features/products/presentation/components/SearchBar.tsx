"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useRef, useState } from "react";
import { tid } from "shared";

import { catalogSearchParams } from "@/features/products/domain/searchParams";

const DEBOUNCE_MS = 300;

export function SearchBar() {
  const t = useTranslations("products");
  const [query, setQuery] = useQueryState("q", catalogSearchParams.q);
  const [localValue, setLocalValue] = useState(query);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when URL param changes externally (browser back/forward)
  useEffect(() => {
    setLocalValue(query);
  }, [query]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const commitQuery = useCallback(
    (value: string) => {
      void setQuery(value === "" ? null : value, { history: "replace" });
    },
    [setQuery],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { value } = e.target;
    setLocalValue(value);

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => commitQuery(value), DEBOUNCE_MS);
  }

  return (
    <div className="relative" {...tid("search-bar")}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        size={16}
        aria-hidden="true"
      />
      <input
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={t("search")}
        className="w-full border-3 border-foreground bg-background pl-9 pr-4 py-2 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-0 rounded-none"
        aria-label={t("search")}
        {...tid("search-bar-input")}
      />
    </div>
  );
}
