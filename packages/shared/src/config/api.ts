/**
 * API configuration constants
 */

import type { UseQueryOptions } from "@tanstack/react-query";

export type PartialQueryOptions = Omit<UseQueryOptions, "queryKey">;

export function orvalOptions(queryOpts: PartialQueryOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { query: queryOpts } as any;
}

export const API_REFRESH_INTERVALS = {
  LIVE: 5000,
  STATIC: false as const,
  SLOW: 30_000,
  HISTORICAL: 60_000,
} as const;

export const API_DEFAULTS = {
  DEFAULT_PAGE_SIZE: 10,
} as const;
