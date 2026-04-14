"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "ui";

import { tid } from "../utils/tid";

export interface ErrorIndicatorProps {
  error: string | null;
  onRetry?: () => void;
}

export function ErrorIndicator({ error, onRetry }: ErrorIndicatorProps) {
  if (!error) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onRetry}
      className="text-warning hover:text-warning/80"
      aria-label={error}
      title={error}
      {...tid("error-indicator")}
    >
      <AlertCircle className="size-4" />
    </Button>
  );
}
