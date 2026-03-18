/* eslint-disable @next/next/no-img-element -- Packages cannot use next/image */
"use client";

export interface BrandLogoLockupProps {
  igrafxAlt: string;
  intramartAlt: string;
  className?: string;
  imageClassName?: string;
  separator?: "line" | "plus" | "none";
  separatorClassName?: string;
}

export function BrandLogoLockup({
  igrafxAlt,
  intramartAlt,
  className,
  imageClassName = "h-7 w-auto",
  separator = "line",
  separatorClassName,
}: BrandLogoLockupProps) {
  let separatorNode: React.ReactNode = null;

  if (separator === "plus") {
    separatorNode = (
      <span className={separatorClassName ?? "text-info"} aria-hidden="true">
        +
      </span>
    );
  } else if (separator === "line") {
    separatorNode = (
      <span
        className={separatorClassName ?? "h-4 w-px bg-border"}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={className}>
      <img
        src="/logos/igrafx_logo.svg"
        alt={igrafxAlt}
        width={104}
        height={32}
        className={`${imageClassName} dark:hidden`}
      />
      <img
        src="/logos/igrafx_logo_dark.svg"
        alt={igrafxAlt}
        width={104}
        height={32}
        className={`hidden ${imageClassName} dark:block`}
      />
      {separatorNode}
      <img
        src="/logos/Intramart_logo.svg"
        alt={intramartAlt}
        width={104}
        height={32}
        className={`${imageClassName} dark:hidden`}
      />
      <img
        src="/logos/intramart_logo_dark.svg"
        alt={intramartAlt}
        width={104}
        height={32}
        className={`hidden ${imageClassName} dark:block`}
      />
    </div>
  );
}
