/* eslint-disable i18next/no-literal-string -- root global error runs without app i18n context */
"use client";

import { RefreshCcw, TriangleAlert } from "lucide-react";

interface GlobalErrorFallbackProps {
  reset: () => void;
}

export function GlobalErrorFallback({ reset }: GlobalErrorFallbackProps) {
  return (
    <html>
      <body className="min-h-screen bg-background antialiased">
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="shadow-brutal-lg w-full max-w-md border-strong border-foreground bg-background p-8 text-center">
            <TriangleAlert className="mx-auto mb-4 size-10 text-destructive" />
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
              Something went wrong
            </h1>
            <button
              type="button"
              onClick={reset}
              className="button-brutal button-press-sm shadow-brutal-sm mt-6 border-strong border-foreground bg-foreground px-5 py-3 text-sm text-background"
            >
              <RefreshCcw className="size-4" />
              Reload page
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
