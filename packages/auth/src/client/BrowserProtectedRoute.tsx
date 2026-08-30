"use client";

import type { ReactNode } from "react";

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
  return (
    <ProtectedRoute authUrl={authUrl} locale={locale}>
      {children}
    </ProtectedRoute>
  );
}
