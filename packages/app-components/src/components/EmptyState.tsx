"use client";

import { useTranslations } from "next-intl";

import { tid } from "../utils/tid";

interface EmptyStateProps {
  message?: string;
  height?: string;
}

export function EmptyState({
  message,
  height = "min-h-state-pane",
}: EmptyStateProps) {
  const tCommon = useTranslations("common");

  return (
    <div
      className={`flex items-center justify-center ${height}`}
      {...tid("empty-state")}
    >
      <p className="text-sm text-muted-foreground">
        {message ?? tCommon("error")}
      </p>
    </div>
  );
}
