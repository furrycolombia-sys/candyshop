import type { ReactNode } from "react";

import { BrowserProtectedRoute } from "./BrowserProtectedRoute";

export function createProtectedRoute(authUrl: string) {
  return function ProtectedRoute({
    locale,
    children,
  }: {
    locale: string;
    children: ReactNode;
  }) {
    return (
      <BrowserProtectedRoute authUrl={authUrl} locale={locale}>
        {children}
      </BrowserProtectedRoute>
    );
  };
}
