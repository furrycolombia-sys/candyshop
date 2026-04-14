import { setRequestLocale } from "next-intl/server";

import { DelegatedOrdersPage } from "@/features/seller-admins";

export default async function DelegatedOrdersRoutePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DelegatedOrdersPage />;
}
