"use client";

import { useEffect, useState, type ReactNode } from "react";

import { featureFlags } from "@shared/config/environment";

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
export function MSWProvider({ children, getWorker }: MSWProviderProps) {
  const [isReady, setIsReady] = useState(!featureFlags.enableMocks);

  useEffect(() => {
    if (!featureFlags.enableMocks) {
      return;
    }

    async function initMSW() {
      if (globalThis.window === undefined) {
        return;
      }

      try {
        const worker = await getWorker();
        await worker.start({
          onUnhandledRequest: "bypass",
          serviceWorker: {
            url: "/mockServiceWorker.js",
          },
        });
        console.warn("[MSW] Mock Service Worker started");
      } catch (error) {
        console.error("[MSW] Failed to start Mock Service Worker:", error);
      } finally {
        setIsReady(true);
      }
    }

    initMSW();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Initializing...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
