/** Fallback display name for sellers without a profile */
export const FALLBACK_SELLER_NAME = "Seller";

/** Fallback display name for buyers without a profile */
export const FALLBACK_BUYER_NAME = "Buyer";

/** Cookie key used by the store app to persist the cart */

/** Browser event fired when the cart cookie changes inside the payments app */
export const CART_COOKIE_CHANGED_EVENT = "libra:cart-cookie-changed";

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

/** Receipts bucket name and signed-URL TTL — re-exported from the shared
 * package so admin and payments cannot drift apart. */
export {
  RECEIPTS_BUCKET,
  RECEIPT_URL_TTL_SECONDS,
} from "shared/constants/receipts";

export { CART_COOKIE_KEY } from "shared";
