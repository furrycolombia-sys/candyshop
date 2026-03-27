/** Cookie key used by the store app to persist the cart */
export const CART_COOKIE_KEY = "candystore-cart";

/** Max receipt file size in bytes (5 MB) */
export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;

/** Accepted receipt image MIME types */
export const ACCEPTED_RECEIPT_TYPES = "image/*";

/** Supabase Storage bucket for receipts */
export const RECEIPTS_BUCKET = "receipts";

/** Default expiry offset for new orders (48 hours) */
export const ORDER_EXPIRY_HOURS = 48;

/** Time conversion constants */
export const MINUTES_PER_HOUR = 60;
export const SECONDS_PER_MINUTE = 60;
export const MS_PER_SECOND = 1000;
