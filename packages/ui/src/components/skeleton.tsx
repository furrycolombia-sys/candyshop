import { cn } from "@ui/utils/cn";

type SkeletonVariant = "shimmer" | "pulse";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

function Skeleton({ className, variant = "shimmer", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md",
        variant === "shimmer" && "skeleton-shimmer",
        variant === "pulse" && "animate-pulse bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
export type { SkeletonProps, SkeletonVariant };
