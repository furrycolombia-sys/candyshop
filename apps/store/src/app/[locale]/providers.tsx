"use client";

import { AuthSessionBootstrap } from "auth";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense, type ReactNode } from "react";

import { CartProvider } from "@/features/cart";
import { ErrorProvider } from "@/shared/application/context/ErrorContext";
import { runtimeEnv } from "@/shared/infrastructure/config/environment";
import {
  ApiAuthBootstrap,
  MSWProvider,
  QueryProvider,
} from "@/shared/infrastructure/providers";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper.
 * Orchestrates all runtime providers for the store app.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <Suspense>
      <NuqsAdapter>
        <QueryProvider>
          <MSWProvider>
            <AuthSessionBootstrap authHostUrl={runtimeEnv.authHostUrl} />
            <ApiAuthBootstrap authHostUrl={runtimeEnv.authHostUrl} />
            <CartProvider>
              <ErrorProvider>{children}</ErrorProvider>
            </CartProvider>
          </MSWProvider>
        </QueryProvider>
      </NuqsAdapter>
    </Suspense>
  );
}
