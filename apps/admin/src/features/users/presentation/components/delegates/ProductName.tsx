"use client";

import { useLocale } from "next-intl";

interface ProductNameProps {
  product: { name_en: string; name_es: string };
}

export function ProductName({ product }: ProductNameProps) {
  const locale = useLocale();
  return (
    <span className="font-medium">
      {locale === "es" ? product.name_es : product.name_en}
    </span>
  );
}
