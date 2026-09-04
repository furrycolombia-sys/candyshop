import { setRequestLocale } from "next-intl/server";

import { ProductListPage } from "@/shared/presentation/pages/ProductListPage";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ProductListPage />;
}
