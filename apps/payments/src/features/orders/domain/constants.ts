export const MY_ORDERS_QUERY_KEY = "my-orders";

export {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_SIZE_BYTES,
  RECEIPTS_BUCKET,
} from "@/shared/domain/constants";

/** Stale time for the orders query (30 seconds) */
export const ORDERS_STALE_TIME_MS = 30_000;
