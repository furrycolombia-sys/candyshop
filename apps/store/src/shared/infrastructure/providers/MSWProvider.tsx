"use client";

import type { ReactNode } from "react";
import { MSWProvider as SharedMSWProvider } from "shared/providers";

const getWorker = () => import("@/mocks/browser").then((m) => m.worker);

export function MSWProvider({ children }: { children: ReactNode }) {
  return (
    <SharedMSWProvider getWorker={getWorker}>{children}</SharedMSWProvider>
  );
}
