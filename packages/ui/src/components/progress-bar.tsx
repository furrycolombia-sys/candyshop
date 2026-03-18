import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/utils/cn";

const progressBarTrackVariants = cva(
  "h-full rounded-full transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-muted-foreground",
        success: "bg-success",
        warning: "bg-warning",
        error: "bg-destructive",
        info: "bg-info",
        brand: "bg-brand",
        "brand-soft": "bg-(--brand-alpha)",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface ProgressBarProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressBarTrackVariants> {
  /** Progress value from 0 to 100 */
  value: number;
  /** Height of the bar */
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-2",
  md: "h-4",
  lg: "h-8",
} as const;

function ProgressBar({
  className,
  variant,
  value,
  size = "lg",
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(value, 0), 100);

  return (
    <div
      className={cn(
        "w-full bg-muted rounded-full overflow-hidden",
        sizeClasses[size],
        className,
      )}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className={cn(progressBarTrackVariants({ variant }))}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export { ProgressBar, progressBarTrackVariants };
