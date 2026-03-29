import { setRequestLocale } from "next-intl/server";

import { UserDetailPage } from "@/features/users";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale, userId } = await params;
  setRequestLocale(locale);
  return <UserDetailPage userId={userId} />;
}
