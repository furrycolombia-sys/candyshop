"use client";

import { useEffect, useState, type ReactNode } from "react";

import { featureFlags } from "@/shared/infrastructure/config";

interface MSWProviderProps {
  children: ReactNode;
}

/**
 * Initializes Mock Service Worker in the browser when mocks are enabled.
 * Enable mocks by setting NEXT_PUBLIC_ENABLE_MOCKS=true
 */
export function MSWProvider({ children }: MSWProviderProps) {
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
        const { worker } = await import("@/mocks/browser");
        await worker.start({
          onUnhandledRequest: "bypass",
          serviceWorker: {
            url: "/mockServiceWorker.js",
          },
        });
        console.log("[MSW] Mock Service Worker started");
      } catch (error) {
        console.error("[MSW] Failed to start Mock Service Worker:", error);
      } finally {
        setIsReady(true);
      }
    }

    initMSW();
  }, []);

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
