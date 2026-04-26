"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "./QueryProvider";

export function QueryOnlyProviders({
  children,
  onQueryError,
}: {
  children: ReactNode;
  onQueryError?: (error: unknown) => void;
}) {
  return <QueryProvider onQueryError={onQueryError}>{children}</QueryProvider>;
}
