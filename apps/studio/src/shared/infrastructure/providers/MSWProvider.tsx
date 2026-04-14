"use client";

import type { ReactNode } from "react";

/**
 * Studio app does not use MSW mocks.
 * This is a passthrough wrapper for provider compatibility.
 */
export function MSWProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
