import { setRequestLocale } from "next-intl/server";

import { UserPermissionsPage } from "@/features/users";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <UserPermissionsPage />;
}
