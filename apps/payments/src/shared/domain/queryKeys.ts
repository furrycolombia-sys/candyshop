/**
 * Every react-query cache key in this app, in one place.
 *
 * They lived in each feature's `domain/constants.ts`, which made a key another
 * feature needs a cross-feature import -- checkout invalidating the orders
 * list, received-orders invalidating the assigned list. Both were reported by
 * scripts/check-feature-boundaries.mjs against the architecture rule.
 *
 * A cache key is not feature-private in the first place: it has to be globally
 * unique to work at all, and invalidation is inherently something one feature
 * does to another's data. Collecting them here makes that explicit and makes
 * the uniqueness checkable by reading one file.
 */

/** assigned-orders */
export const ASSIGNED_ORDERS_QUERY_KEY = "assigned-orders";
/** checkout */
export const SELLER_PROFILES_QUERY_KEY = "seller-profiles";
/** checkout */
export const CHECKOUT_CART_PRODUCTS_QUERY_KEY = "checkout-cart-products";
/** orders */
export const MY_ORDERS_QUERY_KEY = "my-orders";
/** payment-methods */
export const PAYMENT_METHODS_QUERY_KEY = "seller-payment-methods";
/** payment-methods */
export const PAYMENT_METHODS_LIST_QUERY_KEY = "payment-methods";
/** received-orders */
export const RECEIVED_ORDERS_QUERY_KEY = "received-orders";
/** reports */
export const SELLER_REPORTS_QUERY_KEY = "seller-reports-orders";
/** reports */
export const DELEGATED_REPORTS_QUERY_KEY = "delegated-reports";
