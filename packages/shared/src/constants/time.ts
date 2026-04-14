/**
 * Time Constants
 * Centralized time-related values used by QueryProvider and utilities.
 */

export const TIME_CONSTANTS = {
  QUERY: {
    STALE_TIME_MS: 60 * 1000,
    GC_TIME_MS: 5 * 60 * 1000,
  },
} as const;
