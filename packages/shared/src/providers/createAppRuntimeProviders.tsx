"use client";

import type { ReactNode } from "react";

import { AppRuntimeProviders } from "./AppRuntimeProviders";
import type { WrapperComponent } from "./types";

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
