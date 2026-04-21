export const REPORTS_QUERY_KEY = "reports-orders";

export const ORDER_STATUS_LIST = [
  "pending",
  "awaiting_payment",
  "pending_verification",
  "evidence_requested",
  "approved",
  "rejected",
  "expired",
] as const;
