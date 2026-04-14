import { setRequestLocale } from "next-intl/server";

import { ProductCatalogPage } from "@/features/products";

export default async function StorePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ProductCatalogPage />;
}
