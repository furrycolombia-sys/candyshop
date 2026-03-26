import { setRequestLocale } from "next-intl/server";

import { AuditLogPage } from "@/features/audit";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuditLogPage />;
}
