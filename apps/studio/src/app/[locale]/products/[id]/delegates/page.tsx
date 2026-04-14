import { setRequestLocale } from "next-intl/server";

import { ProductDelegatesPage } from "@/features/seller-admins/presentation/pages/ProductDelegatesPage";

export default async function ProductDelegatesRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <ProductDelegatesPage productId={id} />;
}
