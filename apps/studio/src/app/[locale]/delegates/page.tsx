import { setRequestLocale } from "next-intl/server";

import { DelegateManagementPage } from "@/features/seller-admins";

export default async function DelegatesRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DelegateManagementPage />;
}
