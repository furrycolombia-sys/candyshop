import { setRequestLocale } from "next-intl/server";

import { ProductFormPage } from "@/features/products";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ProductFormPage />;
}
