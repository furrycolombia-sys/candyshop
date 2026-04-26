"use client";

import { captureException } from "@sentry/nextjs";
import { createAppRuntimeProviders } from "shared/providers";

import { ErrorProvider } from "@/shared/application/context/ErrorContext";
import { getRuntimeEnv } from "@/shared/infrastructure/config/environment";
import { MSWProvider } from "@/shared/infrastructure/providers";

/**
 * Client-side providers wrapper.
 * Orchestrates all runtime providers for the payments app.
 */
export const Providers = createAppRuntimeProviders({
  authHostUrl: getRuntimeEnv().authHostUrl,
  mswProvider: MSWProvider,
  onQueryError: captureException,
  wrapper: ErrorProvider,
});
