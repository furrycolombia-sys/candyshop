import { setRequestLocale } from "next-intl/server";

import { ReportsPage } from "@/features/reports";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ReportsPage />;
}
