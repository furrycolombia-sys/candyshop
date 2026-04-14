export {
  ACCEPTED_RECEIPT_TYPES,
  CART_COOKIE_KEY,
  MAX_RECEIPT_SIZE_BYTES,
  RECEIPTS_BUCKET,
} from "@/shared/domain/constants";

/** Default expiry offset for new orders (48 hours) */
export const ORDER_EXPIRY_HOURS = 48;

/** Time conversion constants */
export const MINUTES_PER_HOUR = 60;
export const SECONDS_PER_MINUTE = 60;
export const MS_PER_SECOND = 1000;
