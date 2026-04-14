import { setRequestLocale } from "next-intl/server";

import { LoginPage } from "@/features/auth/presentation/pages/LoginPage";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LoginPage />;
}
