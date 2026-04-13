"use client";

import { createBrowserSupabaseClient } from "api/supabase";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { ProtectedRoute } from "./ProtectedRoute";

interface BrowserProtectedRouteProps {
  authUrl: string;
  locale: string;
  children: ReactNode;
}

export function BrowserProtectedRoute({
  authUrl,
  locale,
  children,
}: BrowserProtectedRouteProps) {
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
