"use client";

import { createAppRuntimeProviders } from "shared/providers";

import { ErrorProvider } from "@/shared/application/context/ErrorContext";
import { runtimeEnv } from "@/shared/infrastructure/config/environment";
import { MSWProvider } from "@/shared/infrastructure/providers";

/**
 * Client-side providers wrapper.
 * Orchestrates all runtime providers for the studio app.
 */
export const Providers = createAppRuntimeProviders({
  authHostUrl: runtimeEnv.authHostUrl,
  mswProvider: MSWProvider,
  wrapper: ErrorProvider,
});
