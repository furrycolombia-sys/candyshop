import { setRequestLocale } from "next-intl/server";

import { UserProfilePage } from "@/features/account";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <UserProfilePage userId={id} />;
}
