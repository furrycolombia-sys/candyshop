import { createServerSupabaseClient } from "api/supabase/server";
import { setRequestLocale } from "next-intl/server";

import { AccountSettingsPage } from "@/features/account";
import { LoginPage } from "@/features/auth/presentation/pages/LoginPage";

export default async function AuthPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let isAuthenticated = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    isAuthenticated = !!data.user;
  } catch {
    // Supabase not available — show login
  }

  return isAuthenticated ? <AccountSettingsPage /> : <LoginPage />;
}
