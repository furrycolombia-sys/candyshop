import { setRequestLocale } from "next-intl/server";

import { PaymentMethodsPage } from "@/features/payment-methods/presentation/pages/PaymentMethodsPage";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PaymentMethodsPage />;
}
