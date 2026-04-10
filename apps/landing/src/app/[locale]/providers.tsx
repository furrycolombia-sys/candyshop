"use client";

import { AuthSessionBootstrap } from "auth";
import { Suspense, type ReactNode } from "react";
import { ApiAuthBootstrap } from "shared";

import { runtimeEnv } from "@/shared/infrastructure/config/environment";
import { QueryProvider } from "@/shared/infrastructure/providers";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Suspense>
      <QueryProvider>
        <AuthSessionBootstrap authHostUrl={runtimeEnv.authHostUrl} />
        <ApiAuthBootstrap authHostUrl={runtimeEnv.authHostUrl} />
        {children}
      </QueryProvider>
    </Suspense>
  );
}
