import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/utils/cn";

const statusCardVariants = cva("rounded-lg border p-4 flex flex-col", {
  variants: {
    variant: {
      default: "bg-card border-border",
      success: "surface-success",
      warning: "surface-warning",
      destructive: "surface-destructive",
      info: "surface-info",
      brand: "surface-brand",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface StatusCardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusCardVariants> {}

function StatusCard({
  className,
  variant,
  children,
  ...props
}: StatusCardProps) {
  return (
    <div className={cn(statusCardVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

function StatusCardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start gap-3", className)} {...props} />;
}

function StatusCardIcon({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-0.5 shrink-0", className)} {...props} />;
}

function StatusCardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 min-w-0", className)} {...props} />;
}

function StatusCardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-medium text-sm", className)} {...props}>
      {children}
    </h3>
  );
}

function StatusCardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-muted-foreground mt-1", className)}
      {...props}
    />
  );
}

function StatusCardActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-2 shrink-0", className)}
      {...props}
    />
  );
}

export {
  StatusCard,
  StatusCardHeader,
  StatusCardIcon,
  StatusCardContent,
  StatusCardTitle,
  StatusCardDescription,
  StatusCardActions,
  statusCardVariants,
};
