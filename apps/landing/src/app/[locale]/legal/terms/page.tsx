import { setRequestLocale } from "next-intl/server";

import { TermsPage } from "@/features/legal";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TermsPage />;
}
