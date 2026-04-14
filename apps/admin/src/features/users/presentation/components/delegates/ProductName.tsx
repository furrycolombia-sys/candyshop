"use client";

import { useLocale } from "next-intl";

export function ProductName({
  product,
}: {
  product: { name_en: string; name_es: string };
}) {
  const locale = useLocale();
  return (
    <span className="font-medium">
      {locale === "es" ? product.name_es : product.name_en}
    </span>
  );
}
