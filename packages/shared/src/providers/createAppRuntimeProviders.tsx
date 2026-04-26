"use client";

import type { ReactNode } from "react";

import { AppRuntimeProviders } from "./AppRuntimeProviders";
import type { WrapperComponent } from "./types";

interface CreateAppRuntimeProvidersOptions {
  authHostUrl: string;
  mswProvider: WrapperComponent;
  onQueryError?: (error: unknown) => void;
  wrapper?: WrapperComponent;
}

export function createAppRuntimeProviders({
  authHostUrl,
  mswProvider,
  onQueryError,
  wrapper,
}: CreateAppRuntimeProvidersOptions) {
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <AppRuntimeProviders
        authHostUrl={authHostUrl}
        mswProvider={mswProvider}
        onQueryError={onQueryError}
        wrapper={wrapper}
      >
        {children}
      </AppRuntimeProviders>
    );
  };
}
