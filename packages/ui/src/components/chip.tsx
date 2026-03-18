import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/utils/cn";

/**
 * Chip - Small circular badge for displaying notification counts.
 * For displaying numbers like unread counts, notifications, etc.
 */
const chipVariants = cva(
  "inline-flex items-center justify-center rounded-full text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-destructive text-destructive-foreground",
        brand: "bg-brand text-brand-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        warning: "bg-warning text-warning-foreground",
        info: "bg-info text-info-foreground",
        muted: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "size-4 text-tiny",
        default: "size-5",
        lg: "size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ChipProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  /** The count to display. Values > 99 show "99+" */
  count: number;
  /** Maximum value to display before showing "+" suffix */
  max?: number;
  /** Hide chip when count is 0 */
  hideZero?: boolean;
}

function Chip({
  className,
  variant,
  size,
  count,
  max = 99,
  hideZero = true,
  ...props
}: ChipProps) {
  if (hideZero && count === 0) {
    return null;
  }

  const displayValue = count > max ? `${max}+` : count.toString();

  return (
    <span className={cn(chipVariants({ variant, size }), className)} {...props}>
      {displayValue}
    </span>
  );
}

export { Chip, chipVariants };
