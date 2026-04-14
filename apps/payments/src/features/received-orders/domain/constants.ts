export const RECEIVED_ORDERS_QUERY_KEY = "received-orders";

export const FILTER_STATUSES = [
  "all",
  "pending_verification",
  "evidence_requested",
  "approved",
  "rejected",
  "expired",
] as const;

export type FilterStatus = (typeof FILTER_STATUSES)[number];

/** Stale time for received orders query (30 seconds) */
export const RECEIVED_ORDERS_STALE_TIME_MS = 30_000;

/** Threshold in ms to consider an order "expiring soon" (6 hours) */
export const EXPIRING_SOON_THRESHOLD_MS = 6 * 60 * 60 * 1000;
