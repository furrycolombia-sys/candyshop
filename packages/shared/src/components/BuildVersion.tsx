"use client";

const GIT_SHORT_HASH_LENGTH = 7;

type BuildVersionVariant = "sidebar" | "footer";

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
 *  - `sidebar` (default) for vertical navigation or sidebars.
 *  - `footer` for horizontal footer layouts.
 *
 * Apps provide the hash from their centralized environment config.
 * Uses props injection for i18n, e.g. `(hash) => t("build", { hash })`.
 */
export function BuildVersion({
  hash,
  variant = "sidebar",
  formatLabel,
}: BuildVersionProps) {
  const shortHash = hash.slice(0, GIT_SHORT_HASH_LENGTH);
  const label = formatLabel ? formatLabel(shortHash) : `Build: ${shortHash}`;

  return (
    <span
      className={
        variant === "sidebar"
          ? "block select-all text-center font-mono text-ui-xs text-muted-foreground/30"
          : "select-all font-mono text-ui-xs text-muted-foreground/30"
      }
      title={hash}
    >
      {label}
    </span>
  );
}
