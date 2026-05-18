export const ORDER_STATUS_LIST = [
  "pending",
  "awaiting_payment",
  "pending_verification",
  "evidence_requested",
  "approved",
  "rejected",
  "expired",
] as const;

/** O(1) lookup over ORDER_STATUS_LIST. Shared so every route that
 * validates a `status` filter draws from the same canonical set. */
export const ORDER_STATUS_SET: ReadonlySet<string> = new Set(ORDER_STATUS_LIST);
