/**
 * Time Constants
 * Centralized time-related values used by QueryProvider and utilities.
 */

/** Raw time unit conversion factors */
export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;

export const TIME_CONSTANTS = {
  QUERY: {
    STALE_TIME_MS: 60 * 1000,
    GC_TIME_MS: 5 * 60 * 1000,
  },
} as const;
