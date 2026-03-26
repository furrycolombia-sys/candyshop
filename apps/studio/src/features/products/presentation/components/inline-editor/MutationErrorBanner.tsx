"use client";

import { AlertTriangle } from "lucide-react";
import { tid } from "shared";

interface MutationErrorBannerProps {
  message: string;
}

export function MutationErrorBanner({ message }: MutationErrorBannerProps) {
  return (
    <div
      className="sticky top-[61px] z-30 border-b border-destructive/30 bg-destructive/8 px-4 py-2.5 backdrop-blur-xl backdrop-saturate-150"
      role="alert"
      {...tid("mutation-error-banner")}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <AlertTriangle className="size-4 shrink-0 text-destructive" />
        <span className="font-mono text-xs text-destructive">{message}</span>
      </div>
    </div>
  );
}
