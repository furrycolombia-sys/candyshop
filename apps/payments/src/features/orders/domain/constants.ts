import type { OrderStatus } from "@/features/orders/domain/types";

export const MY_ORDERS_QUERY_KEY = "my-orders";

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  awaiting_payment: "bg-warning/15 text-warning border-warning/30",
  pending_verification: "bg-info/15 text-info border-info/30",
  evidence_requested: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  expired: "bg-muted text-muted-foreground",
  paid: "bg-success/15 text-success border-success/30",
};

/** Max receipt file size in bytes (5 MB) */
export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;

/** Accepted receipt image MIME types */
export const ACCEPTED_RECEIPT_TYPES = "image/*";

/** Supabase Storage bucket for receipts */
export const RECEIPTS_BUCKET = "receipts";

/** Stale time for the orders query (30 seconds) */
export const ORDERS_STALE_TIME_MS = 30_000;
