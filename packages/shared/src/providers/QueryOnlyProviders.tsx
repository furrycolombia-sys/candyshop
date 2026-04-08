"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "./QueryProvider";

export function QueryOnlyProviders({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
