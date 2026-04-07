import {
  ALL_PERMISSION_KEYS,
  PERMISSION_TEMPLATES,
} from "@/features/users/domain/constants";
import type { UserRole } from "@/features/users/domain/types";

/** Check if all keys in `required` are present in `granted` */
function hasAll(granted: string[], required: string[]): boolean {
  return required.every((k) => granted.includes(k));
}

/**
 * Determine a user's display role based on their granted permission keys.
 * Checks highest role first (admin → seller → buyer).
 */
export function computeRole(grantedKeys: string[]): UserRole {
  if (grantedKeys.length === 0) return "none";

  if (hasAll(grantedKeys, ALL_PERMISSION_KEYS)) return "admin";

  const sellerKeys = [...new Set(PERMISSION_TEMPLATES.seller)];
  if (hasAll(grantedKeys, sellerKeys)) return "seller";

  if (hasAll(grantedKeys, PERMISSION_TEMPLATES.buyer)) return "buyer";

  return "custom";
}
