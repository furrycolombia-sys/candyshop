import * as React from "react";

import type { RequiredAccessibleName } from "@ui/utils/accessibleName";
import { cn } from "@ui/utils/cn";

type CircularProgressProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "aria-label" | "aria-labelledby"
> & {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  color?: string;
} & RequiredAccessibleName;

function CircularProgress({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  showValue = true,
  color = "var(--brand)",
  className,
  ...props
}: CircularProgressProps) {
  const containerStyle = { width: size, height: size };
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      style={containerStyle}
      // Without these this rendered as a plain <div>: visually a progress
      // indicator, and completely invisible to assistive technology. axe
      // cannot flag that, because there is no role to find a fault with.
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      {showValue && (
        <span className="absolute text-xs font-semibold">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

export { CircularProgress };
