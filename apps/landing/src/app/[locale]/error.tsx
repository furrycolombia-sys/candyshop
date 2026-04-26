"use client";

import { RouteErrorFallback } from "@monorepo/app-components";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function RouteErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const t = useTranslations("common");
  return (
    <RouteErrorFallback
      reset={reset}
      errorLabel={t("error")}
      retryLabel={t("retry")}
    />
  );
}
