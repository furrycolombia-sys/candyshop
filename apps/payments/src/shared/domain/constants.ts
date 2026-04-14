/** Fallback display name for sellers without a profile */
export const FALLBACK_SELLER_NAME = "Seller";

/** Fallback display name for buyers without a profile */
export const FALLBACK_BUYER_NAME = "Buyer";

/** Cookie key used by the store app to persist the cart */
export const CART_COOKIE_KEY = "candystore-cart";

/** Browser event fired when the cart cookie changes inside the payments app */
export const CART_COOKIE_CHANGED_EVENT = "candystore:cart-cookie-changed";

/** Max receipt file size in bytes (5 MB) */
export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;

/** Accepted receipt image MIME types */
export const ACCEPTED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** String form used by file inputs */
export const ACCEPTED_RECEIPT_TYPES = ACCEPTED_RECEIPT_MIME_TYPES.join(",");

/** Supabase Storage bucket for receipts */
export const RECEIPTS_BUCKET = "receipts";

/** Signed receipt URLs stay valid for one hour */
export const RECEIPT_URL_TTL_SECONDS = 60 * 60;
