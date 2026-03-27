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

/** Fallback display name for sellers without a profile */
export const FALLBACK_SELLER_NAME = "Seller";

/**
 * Formats a COP amount as a currency string (e.g. "$ 12.000 COP").
 * Uses Intl.NumberFormat so no literal currency code leaks into components.
 */
export const COP_CURRENCY_CODE = "COP";
const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: COP_CURRENCY_CODE,
  minimumFractionDigits: 0,
});
export function formatCop(amount: number): string {
  return copFormatter.format(amount);
}

/** Time conversion constants */
export const MINUTES_PER_HOUR = 60;
export const SECONDS_PER_MINUTE = 60;
export const MS_PER_SECOND = 1000;
