import * as React from "react";

import { cn } from "@ui/utils/cn";

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  color?: string;
}

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
