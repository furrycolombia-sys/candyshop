import { setRequestLocale } from "next-intl/server";

import { ProductFormPage } from "@/features/products";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <ProductFormPage productId={id} />;
}
