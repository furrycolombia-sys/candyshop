import { setRequestLocale } from "next-intl/server";

import { TemplatesPage } from "@/features/templates";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TemplatesPage />;
}
