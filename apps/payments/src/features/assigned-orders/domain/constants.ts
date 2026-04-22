export const ASSIGNED_ORDERS_QUERY_KEY = "assigned-orders";

/** Stale time for assigned orders query (30 seconds) */
export const ASSIGNED_ORDERS_STALE_TIME_MS = 30_000;

export const ASSIGNED_FILTER_STATUSES = [
  "actionable",
  "all",
  "pending_verification",
  "evidence_requested",
  "approved",
  "rejected",
  "expired",
] as const;

export type AssignedFilterStatus = (typeof ASSIGNED_FILTER_STATUSES)[number];
