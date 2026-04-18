export const MY_ORDERS_QUERY_KEY = "my-orders";

export {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_SIZE_BYTES,
  RECEIPTS_BUCKET,
} from "@/shared/domain/constants";

/** Stale time for the orders query (30 seconds) */
export const ORDERS_STALE_TIME_MS = 30_000;

/**
 * Maps each OrderStatus to its semantic Tailwind CSS classes.
 * Used by OrderStatusBadge and OrderCard banner to apply consistent status styling.
 */
export const STATUS_CLASS_MAP: Record<string, string> = {
  awaiting_payment: "bg-warning/15 text-warning border-warning/30",
  evidence_requested: "bg-warning/15 text-warning border-warning/30",
  pending_verification: "bg-info/15 text-info border-info/30",
  approved: "bg-success/15 text-success border-success/30",
  paid: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
} satisfies Partial<Record<string, string>>;

/** Fallback classes applied when a status is not in STATUS_CLASS_MAP */
export const STATUS_CLASS_DEFAULT = "bg-muted text-muted-foreground";
