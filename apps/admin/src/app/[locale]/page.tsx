import { setRequestLocale } from "next-intl/server";

import { DashboardPage } from "@/features/dashboard";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DashboardPage />;
}
