"use client";

import { useLocale } from "next-intl";
import { type ReactNode, useEffect } from "react";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";
import { usePathname, useRouter } from "@/shared/infrastructure/i18n";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Wraps content that requires authentication.
 *
 * Redirects to /login with a returnTo parameter if the user is not signed in.
 * Shows nothing while checking auth state to prevent flash of content.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${locale}/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname, locale]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
