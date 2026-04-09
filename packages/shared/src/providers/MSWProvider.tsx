"use client";

import type { ReactNode } from "react";

interface MSWProviderProps {
  children: ReactNode;
  /**
   * Lazy loader for the MSW browser worker.
   * Each app passes its own: () => import("@/mocks/browser").then(m => m.worker)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getWorker: () => Promise<{ start: (options?: any) => Promise<any> }>;
}

/**
 * Initializes Mock Service Worker in the browser when mocks are enabled.
 * Enable mocks by setting NEXT_PUBLIC_ENABLE_MOCKS=true
 */
export function MSWProvider({
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getWorker: _getWorker,
}: MSWProviderProps) {
  return <>{children}</>;
}
