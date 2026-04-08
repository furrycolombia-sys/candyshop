import type { ReactNode } from "react";

import { BrowserProtectedRoute } from "./BrowserProtectedRoute";

export function createProtectedRoute(authUrl: string) {
  return function ProtectedRoute({ children }: { children: ReactNode }) {
    return (
      <BrowserProtectedRoute authUrl={authUrl}>
        {children}
      </BrowserProtectedRoute>
    );
  };
}
