"use client";

import { GlobalErrorFallback } from "@monorepo/app-components";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <GlobalErrorFallback reset={reset} />;
}
