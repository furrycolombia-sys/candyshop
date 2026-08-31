import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@ui/utils/cn";

/**
 * StatusLabel - Status badge with solid colours and icons.
 * For process statuses like "Healthy", "Attention", "Critical".
 *
 * Renamed from `Label`. It renders a <span> and has no htmlFor, so under the
 * old name it collided with the shadcn convention where label.tsx IS the form
 * label -- importing `Label` to label an input gave no association at all, the
 * exact defect axe's `label` rule exists to catch. Nothing imported it, so the
 * rename cost nothing; it also frees `label.tsx` for a real form label.
 */
const statusLabelVariants = cva(
  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
  {
    variants: {
      variant: {
        healthy: "bg-success text-success-foreground",
        attention: "bg-warning text-warning-foreground",
        critical: "bg-destructive text-destructive-foreground",
        info: "bg-info text-info-foreground",
        brand: "bg-brand text-brand-foreground",
        "brand-soft": "bg-(--brand-alpha) text-brand-text",
      },
    },
    defaultVariants: {
      variant: "healthy",
    },
  },
);

/**
 * Icon configuration for each status variant.
 * Maps variant to default icon and whether to show icon wrapper (circle border).
 */
const STATUS_ICONS: Record<
  NonNullable<VariantProps<typeof statusLabelVariants>["variant"]>,
  { icon: LucideIcon; showWrapper: boolean }
> = {
  healthy: { icon: Check, showWrapper: true },
  attention: { icon: AlertTriangle, showWrapper: false },
  critical: { icon: X, showWrapper: true },
  info: { icon: Info, showWrapper: false },
  brand: { icon: Check, showWrapper: true },
  "brand-soft": { icon: Check, showWrapper: true },
};

export interface StatusLabelProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusLabelVariants> {
  /** Show the default icon for this variant */
  showIcon?: boolean;
  /** Custom icon to override the default */
  icon?: LucideIcon;
  /** Force icon wrapper on/off (defaults based on variant) */
  showIconWrapper?: boolean;
}

function StatusLabel({
  className,
  variant = "healthy",
  showIcon = true,
  icon,
  showIconWrapper,
  children,
  ...props
}: StatusLabelProps) {
  const iconConfig = variant ? STATUS_ICONS[variant] : STATUS_ICONS.healthy;
  const Icon = icon ?? iconConfig.icon;
  const shouldShowWrapper = showIconWrapper ?? iconConfig.showWrapper;

  return (
    <span
      className={cn(statusLabelVariants({ variant }), className)}
      {...props}
    >
      {showIcon && (
        <>
          {shouldShowWrapper ? (
            <span className="size-4 rounded-full border border-current flex items-center justify-center">
              <Icon className="size-3" aria-hidden="true" />
            </span>
          ) : (
            <Icon className="size-3" aria-hidden="true" />
          )}
        </>
      )}
      {children}
    </span>
  );
}

export { StatusLabel, statusLabelVariants };
