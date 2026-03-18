"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { tid } from "../utils/tid";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  height?: string;
}

export function LoadingState({
  message,
  size = "lg",
  height = "h-[60vh]",
}: LoadingStateProps) {
  const tCommon = useTranslations("common");
  let iconSizeClass = "size-8";
  if (size === "sm") {
    iconSizeClass = "size-4";
  } else if (size === "md") {
    iconSizeClass = "size-6";
  }

  return (
    <div
      className={`flex items-center justify-center ${height}`}
      {...tid("loading-state")}
    >
      <div className="text-center">
        <RefreshCw
          className={`${iconSizeClass} mx-auto animate-spin text-muted-foreground`}
        />
        <p className="mt-4 text-sm text-muted-foreground">
          {message ?? tCommon("loading")}
        </p>
      </div>
    </div>
  );
}
