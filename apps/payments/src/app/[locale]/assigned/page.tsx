import { setRequestLocale } from "next-intl/server";

import { AssignedOrdersPage } from "@/features/assigned-orders";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AssignedOrdersPage />;
}
