"use client";

import type { ComponentType, ReactNode } from "react";

import { AppRuntimeProviders } from "./AppRuntimeProviders";

type WrapperComponent = ComponentType<{ children: ReactNode }>;

interface CreateAppRuntimeProvidersOptions {
  authHostUrl: string;
  mswProvider: WrapperComponent;
  wrapper?: WrapperComponent;
}

export function createAppRuntimeProviders({
  authHostUrl,
  mswProvider,
  wrapper,
}: CreateAppRuntimeProvidersOptions) {
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <AppRuntimeProviders
        authHostUrl={authHostUrl}
        mswProvider={mswProvider}
        wrapper={wrapper}
      >
        {children}
      </AppRuntimeProviders>
    );
  };
}
