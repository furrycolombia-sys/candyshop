"use client";

import { useCallback, useState } from "react";

import type { Lang } from "@/features/products/domain/constants";

/** Shared hook for EN/ES language toggle across section editors */
export function useLangToggle() {
  const [lang, setLang] = useState<Lang>("en");
  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "en" ? "es" : "en"));
  }, []);
  return { lang, toggleLang };
}
