import { setRequestLocale } from "next-intl/server";

import { ProductDetailPage } from "@/features/products";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <ProductDetailPage slug={slug} />;
}
