"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";

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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
