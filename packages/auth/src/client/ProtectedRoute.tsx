"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { type ReactNode, useEffect } from "react";

import { useAuth } from "./useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Full URL to the auth app (e.g. "http://localhost:5000") */
  authUrl: string;
  /** Current locale for the redirect URL */
  locale: string;
  /** Supabase client instance */
  supabaseClient: SupabaseClient;
  /** Content to show while checking auth. Defaults to empty. */
  fallback?: ReactNode;
}

/**
 * Wraps content that requires authentication.
 *
 * Redirects to the auth app's login page if the user is not signed in.
 * Shows a fallback while checking auth state to prevent flash of content.
 */
export function ProtectedRoute({
  children,
  authUrl,
  locale,
  supabaseClient,
  fallback = null,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth({ supabaseClient });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnTo = globalThis.location.href;
      globalThis.location.replace(
        `${authUrl}/${locale}/login?returnTo=${encodeURIComponent(returnTo)}`,
      );
    }
  }, [isLoading, isAuthenticated, authUrl, locale]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
