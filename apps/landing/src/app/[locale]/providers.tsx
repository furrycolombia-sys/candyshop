"use client";

import { captureException } from "@sentry/nextjs";
import { AuthSessionBootstrap } from "auth";
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
        <AuthSessionBootstrap authHostUrl={authHostUrl} />
        <ApiAuthBootstrap authHostUrl={authHostUrl} />
        {children}
      </QueryProvider>
    </Suspense>
  );
}
