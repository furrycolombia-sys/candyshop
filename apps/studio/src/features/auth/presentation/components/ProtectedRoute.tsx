"use client";

import { createBrowserSupabaseClient } from "api/supabase";
import { ProtectedRoute as BaseProtectedRoute } from "auth/client";
import { useLocale } from "next-intl";
import { type ReactNode, useMemo } from "react";

import { appUrls } from "@/shared/infrastructure/config";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const supabaseClient = useMemo(() => createBrowserSupabaseClient(), []);

  return (
    <BaseProtectedRoute
      authUrl={appUrls.auth}
      locale={locale}
      supabaseClient={supabaseClient}
    >
      {children}
    </BaseProtectedRoute>
  );
}
