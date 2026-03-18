/**
 * Numeric Constants
 * Centralized numeric magic numbers for calculations and conversions
 */

export const NUMERIC_CONSTANTS = {
  PERCENTAGE: {
    MULTIPLIER: 100,
    MAX: 100,
    MIN: 0,
  },

  STRING: {
    GIT_SHORT_HASH_LENGTH: 7,
    INITIALS_LENGTH: 2,
    ID_DISPLAY_LENGTH: 8,
  },

  DISPLAY: {
    MAX_ITEMS: 10,
    DECIMAL_PRECISION: 2,
    JSON_INDENT: 2,
    ERROR_TRUNCATION_LENGTH: 100,
  },

  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
  },

  TABLE: {
    EVEN_ROW_DIVISOR: 2,
  },
} as const;
