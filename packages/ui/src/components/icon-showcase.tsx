import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/utils/cn";

const iconShowcaseVariants = cva(
  "inline-flex items-center justify-center rounded-full shrink-0",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        success: "bg-success/15 text-success",
        destructive: "bg-destructive/15 text-destructive",
        warning: "bg-warning/15 text-warning",
        info: "bg-info/15 text-info",
        brand: "bg-brand/15 text-brand",
      },
      size: {
        xs: "size-5",
        sm: "size-6",
        md: "size-8",
        lg: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface IconShowcaseProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconShowcaseVariants> {}

function IconShowcase({
  className,
  variant,
  size,
  children,
  ...props
}: IconShowcaseProps) {
  return (
    <div
      className={cn(iconShowcaseVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { IconShowcase, iconShowcaseVariants };
