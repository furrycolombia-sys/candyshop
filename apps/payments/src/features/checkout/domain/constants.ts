export {
  ACCEPTED_RECEIPT_TYPES,
  CART_COOKIE_KEY,
  MAX_RECEIPT_SIZE_BYTES,
  RECEIPTS_BUCKET,
} from "@/shared/domain/constants";

/** Session storage key used to persist checkout completion across page refreshes */
export const CHECKOUT_COMPLETED_SESSION_KEY = "candystore-checkout-completed";

/** Sentinel value stored in session storage when checkout is completed */
export const CHECKOUT_COMPLETED_VALUE = "1";

/** Error code thrown when stock reservation fails */
export const STOCK_ERROR_CODE = "stock_error";

export const SELLER_PROFILES_QUERY_KEY = "seller-profiles";
export const CHECKOUT_CART_PRODUCTS_QUERY_KEY = "checkout-cart-products";

/** Default expiry offset for new orders (48 hours) */
export const ORDER_EXPIRY_HOURS = 48;

/** Time conversion constants */
export {
  MINUTES_PER_HOUR,
  SECONDS_PER_MINUTE,
  MS_PER_SECOND,
} from "shared/constants/time";
