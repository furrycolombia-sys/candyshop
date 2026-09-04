import { auth } from "@clerk/nextjs/server";
import { setRequestLocale } from "next-intl/server";

import { AccountSettingsPage } from "@/features/account";
import { LoginPage } from "@/features/auth";

export default async function AuthPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();

  return userId ? <AccountSettingsPage /> : <LoginPage />;
}
