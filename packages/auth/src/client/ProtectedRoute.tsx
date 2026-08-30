"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { useCurrentUser } from "./useCurrentUser";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Full URL to the auth app (e.g. "http://localhost:5000") */
  authUrl: string;
  /** Current locale for the redirect URL */
  locale: string;
  /** Content to show while checking auth. Defaults to empty. */
  fallback?: ReactNode;
}

/**
 * Wraps content that requires authentication.
 *
 * Redirects to the auth app's login page if the user is not signed in.
 * Shows a fallback while checking auth state to prevent flash of content.
 *
 * Used to check `useAuth({ supabaseClient })` — a Supabase Auth session that
 * no longer exists under Third-Party Auth, so this component redirected
 * every signed-in visitor straight back to login on every app that wraps
 * pages in `<ProtectedRoute>` (store, admin, payments, studio). Replaced
 * with `useCurrentUser()`, which resolves sign-in state from Clerk.
 */
export function ProtectedRoute({
  children,
  authUrl,
  locale,
  fallback = null,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useCurrentUser();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      hasRedirectedRef.current = false;
      return;
    }

    if (!isLoading && !isAuthenticated && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
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
