import type { DelegatePermission } from "./types";

/** All valid delegate permission values */
export const DELEGATE_PERMISSIONS: DelegatePermission[] = [
  "orders.approve",
  "orders.request_proof",
];

/** TanStack Query key for the seller-admins list */
export const SELLER_ADMINS_QUERY_KEY = "seller-admins";

/** TanStack Query key for delegated orders */
export const DELEGATED_ORDERS_QUERY_KEY = "delegated-orders";

/** Order statuses that a delegate can act on */
export const ACTIONABLE_ORDER_STATUSES = [
  "pending_verification",
  "evidence_requested",
] as const;
