"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "ui";

import { tid } from "../utils/tid";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  height?: string;
}

export function ErrorState({
  message,
  onRetry,
  retryLabel,
  height = "h-[60vh]",
}: ErrorStateProps) {
  const tCommon = useTranslations("common");

  return (
    <div
      className={`flex items-center justify-center ${height}`}
      {...tid("error-state")}
    >
      <div className="text-center">
        <p className="text-sm text-destructive">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 size-4" />
            {retryLabel ?? tCommon("retry")}
          </Button>
        )}
      </div>
    </div>
  );
}
