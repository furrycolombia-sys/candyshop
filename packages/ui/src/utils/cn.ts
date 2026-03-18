import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Extended tailwind-merge that recognizes custom font-size utilities.
 *
 * By default, tailwind-merge treats all `text-*` classes as the same group,
 * which causes custom font-size utilities like `text-tiny` to be incorrectly
 * merged with text-color classes (e.g., `text-success`).
 *
 * This configuration registers custom font-size utilities in the `font-size`
 * class group so they coexist properly with text-color classes.
 *
 * @example
 * // Without this fix: "text-tiny text-success" → "text-success" (text-tiny stripped!)
 * // With this fix: "text-tiny text-success" → "text-tiny text-success" (both preserved)
 *
 * To add more custom font-size utilities, add them to the "font-size" array below.
 * These should match the custom `--text-*` variables defined in globals.css @theme inline.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": ["text-tiny"],
    },
  },
});

/**
 * Utility for constructing className strings conditionally.
 * Combines clsx for conditional classes with tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
