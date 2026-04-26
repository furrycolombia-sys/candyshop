"use client";

import { AuthSessionBootstrap } from "auth";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import * as React from "react";
import { Suspense, type ReactNode } from "react";

import { ApiAuthBootstrap } from "./ApiAuthBootstrap";
import { QueryProvider } from "./QueryProvider";
import type { WrapperComponent } from "./types";

interface AppRuntimeProvidersProps {
  authHostUrl: string;
  children: ReactNode;
  mswProvider: WrapperComponent;
  onQueryError?: (error: unknown) => void;
  wrapper?: WrapperComponent;
}

export function AppRuntimeProviders({
  authHostUrl,
  children,
  mswProvider,
  onQueryError,
  wrapper,
}: AppRuntimeProvidersProps) {
  const content = wrapper
    ? React.createElement(wrapper, null, children)
    : children;
  const mswChildren = (
    <>
      <AuthSessionBootstrap authHostUrl={authHostUrl} />
      <ApiAuthBootstrap authHostUrl={authHostUrl} />
      {content}
    </>
  );

  return (
    <Suspense>
      <NuqsAdapter>
        <QueryProvider onQueryError={onQueryError}>
          {React.createElement(mswProvider, null, mswChildren)}
        </QueryProvider>
      </NuqsAdapter>
    </Suspense>
  );
}
