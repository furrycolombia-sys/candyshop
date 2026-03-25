"use client";

import { useMediaQuery } from "usehooks-ts";

/** Tailwind breakpoints */
const SM_QUERY = "(min-width: 640px)";
const LG_QUERY = "(min-width: 1024px)";

/** Column counts matching grid-cols-1 / sm:grid-cols-2 / lg:grid-cols-3 */
const MOBILE_COLS = 1;
const SM_COLS = 2;
const LG_COLS = 3;

/**
 * Returns the current grid column count (1, 2, or 3) based on viewport width.
 * Reactive — updates when the browser crosses a breakpoint boundary.
 */
export function useGridCols(): number {
  const isLg = useMediaQuery(LG_QUERY);
  const isSm = useMediaQuery(SM_QUERY);

  if (isLg) return LG_COLS;
  if (isSm) return SM_COLS;
  return MOBILE_COLS;
}
