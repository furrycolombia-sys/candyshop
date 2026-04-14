import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/utils/cn";

/**
 * InfoBadge variants use soft/translucent backgrounds similar to StatusCard.
 * For informative labels like "Today", "Active", "In Progress", etc.
 * Base styles match the Badge component for consistent sizing.
 */
const infoBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-muted/50 text-muted-foreground border-border",
        success: "bg-success/20 text-success border-success/30",
        warning: "bg-warning/20 text-warning-foreground border-warning/30",
        destructive: "bg-destructive/20 text-destructive border-destructive/30",
        info: "bg-info/20 text-info border-info/30",
        brand: "bg-(--brand-alpha) text-brand-text border-brand-text/30",
      },
      size: {
        sm: "px-2 py-0.5 text-ui-xs gap-1 [&>svg]:size-3",
        md: "px-2.5 py-1 text-xs gap-1.5 [&>svg]:size-3.5",
        lg: "px-3 py-1.5 text-sm gap-2 [&>svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

/**
 * Props for the InfoBadge component.
 * @property variant - Visual style variant (default, success, warning, destructive, info, brand)
 * @property className - Additional CSS classes to apply
 */
export interface InfoBadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof infoBadgeVariants> {}

function InfoBadge({ className, variant, size, ...props }: InfoBadgeProps) {
  return (
    <span
      className={cn(infoBadgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { InfoBadge, infoBadgeVariants };
