"use client";

const GIT_SHORT_HASH_LENGTH = 7;

const VARIANT_CLASSES = {
  /** Centered block — use inside sidebars / vertical navigation. */
  sidebar:
    "block text-center font-mono text-tiny text-muted-foreground/30 select-all",
  /** Inline span — use inside footers or horizontal layouts. */
  footer: "font-mono text-tiny text-muted-foreground/30 select-all",
} as const;

type BuildVersionVariant = keyof typeof VARIANT_CLASSES;

interface BuildVersionProps {
  /** The full build hash from the app's environment config. */
  hash: string;
  /** Layout variant. Defaults to `"sidebar"`. */
  variant?: BuildVersionVariant;
  /** Function that receives the short hash and returns the display label.
   *  Defaults to `(hash) => \`Build: ${hash}\`` if not provided. */
  formatLabel?: (shortHash: string) => string;
}

/**
 * Displays the current build hash for deployment verification.
 *
 * Variants:
 *  - `sidebar` (default) — centered block for vertical navigation / sidebars.
 *  - `footer` — inline span for horizontal footer layouts.
 *
 * Apps provide the hash from their centralized environment config.
 * Uses props injection for i18n — apps pass a `formatLabel` function
 * that handles translation, e.g. `(hash) => t("build", { hash })`.
 */
export function BuildVersion({
  hash,
  variant = "sidebar",
  formatLabel,
}: BuildVersionProps) {
  const shortHash = hash.slice(0, GIT_SHORT_HASH_LENGTH);
  const label = formatLabel ? formatLabel(shortHash) : `Build: ${shortHash}`;

  return (
    <span className={VARIANT_CLASSES[variant]} title={hash}>
      {label}
    </span>
  );
}
