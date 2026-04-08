"use client";

import { createBrowserSupabaseClient } from "api/supabase";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { ProtectedRoute } from "./ProtectedRoute";

interface BrowserProtectedRouteProps {
  authUrl: string;
  children: ReactNode;
}

export function BrowserProtectedRoute({
  authUrl,
  children,
}: BrowserProtectedRouteProps) {
  const locale = useLocale();
  const supabaseClient = useMemo(() => createBrowserSupabaseClient(), []);

  return (
    <ProtectedRoute
      authUrl={authUrl}
      locale={locale}
      supabaseClient={supabaseClient}
    >
      {children}
    </ProtectedRoute>
  );
}
