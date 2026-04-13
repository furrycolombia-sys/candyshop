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
  wrapper?: WrapperComponent;
}

export function AppRuntimeProviders({
  authHostUrl,
  children,
  mswProvider,
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
        <QueryProvider>
          {React.createElement(mswProvider, null, mswChildren)}
        </QueryProvider>
      </NuqsAdapter>
    </Suspense>
  );
}
