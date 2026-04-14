import type { DelegatePermission } from "./types";

/** All valid delegate permission values */
export const DELEGATE_PERMISSIONS: DelegatePermission[] = [
  "orders.approve",
  "orders.request_proof",
];

/** TanStack Query key for the seller-admins list */
export const SELLER_ADMINS_QUERY_KEY = "seller-admins";
