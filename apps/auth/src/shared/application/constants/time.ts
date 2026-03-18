/**
 * Time Constants
 * Centralized time-related magic numbers
 */

export const TIME_CONSTANTS = {
  MILLISECONDS: {
    ONE_SECOND: 1000,
    ONE_MINUTE: 60 * 1000,
    ONE_HOUR: 60 * 60 * 1000,
    ONE_DAY: 24 * 60 * 60 * 1000,
    THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
  },

  CONVERSION: {
    SECONDS_IN_MINUTE: 60,
    MINUTES_IN_HOUR: 60,
    HOURS_IN_DAY: 24,
    DAYS_IN_WEEK: 7,
    DAYS_IN_MONTH: 30,
    MS_IN_SECOND: 1000,
  },

  DAYS: {
    ONE: 1,
    SEVEN: 7,
    THIRTY: 30,
  },

  GREETING_HOURS: {
    MORNING_END: 12,
    AFTERNOON_END: 18,
  },

  TEST: {
    GC_TIME: 0,
    DEFAULT_DELAY: 0,
    MOCK_DELAY_MIN: 100,
  },

  API: {
    TIMEOUT: 30_000,
    CANCEL_MESSAGE: "Request cancelled",
  },

  QUERY: {
    STALE_TIME_MS: 60 * 1000,
    GC_TIME_MS: 5 * 60 * 1000,
  },
} as const;
