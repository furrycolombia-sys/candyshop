"use client";

import { captureException } from "@sentry/nextjs";
import { Suspense, type ReactNode } from "react";
import { ApiAuthBootstrap } from "shared";

import { getRuntimeEnv } from "@/shared/infrastructure/config/environment";
import { QueryProvider } from "@/shared/infrastructure/providers";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const { authHostUrl } = getRuntimeEnv();
  return (
    <Suspense>
      <QueryProvider onQueryError={captureException}>
        <ApiAuthBootstrap authHostUrl={authHostUrl} />
        {children}
      </QueryProvider>
    </Suspense>
  );
}
