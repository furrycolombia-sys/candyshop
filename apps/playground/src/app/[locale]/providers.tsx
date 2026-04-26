"use client";

import { captureException } from "@sentry/nextjs";
import type { ReactNode } from "react";
import { QueryOnlyProviders } from "shared/providers";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryOnlyProviders onQueryError={captureException}>
      {children}
    </QueryOnlyProviders>
  );
}
