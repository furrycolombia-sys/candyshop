"use client";

import { AuthSessionBootstrap } from "auth";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense, type ReactNode } from "react";

import { CartProvider, FlyToCartProvider } from "@/features/cart";
import { ErrorProvider } from "@/shared/application/context/ErrorContext";
import { getRuntimeEnv } from "@/shared/infrastructure/config/environment";
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
  const { authHostUrl } = getRuntimeEnv();
  return (
    <Suspense>
      <NuqsAdapter>
        <QueryProvider>
          <MSWProvider>
            <AuthSessionBootstrap authHostUrl={authHostUrl} />
            <ApiAuthBootstrap authHostUrl={authHostUrl} />
            <CartProvider>
              <FlyToCartProvider>
                <ErrorProvider>{children}</ErrorProvider>
              </FlyToCartProvider>
            </CartProvider>
          </MSWProvider>
        </QueryProvider>
      </NuqsAdapter>
    </Suspense>
  );
}
