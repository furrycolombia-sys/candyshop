"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function RouteErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  return (
    <main className="flex min-h-app-pane flex-1 items-center justify-center surface-grid-dots p-6">
      <div className="shadow-brutal-lg w-full max-w-md border-strong border-foreground bg-background p-8 text-center">
        <AlertTriangle className="mx-auto mb-4 size-10 text-destructive" />
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
          {t("error")}
        </h1>
        <button
          type="button"
          onClick={() => reset()}
          className="button-brutal button-press-sm shadow-brutal-sm mt-6 border-strong border-foreground bg-foreground px-5 py-3 text-sm text-background"
        >
          <RotateCcw className="size-4" />
          {t("retry")}
        </button>
      </div>
    </main>
  );
}
