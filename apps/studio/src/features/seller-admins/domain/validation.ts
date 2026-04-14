import { DELEGATE_PERMISSIONS } from "./constants";
import type { DelegatePermission } from "./types";

/**
 * Validates inputs for creating or updating a delegation.
 *
 * @throws {Error} if sellerId equals adminUserId (self-delegation)
 * @throws {Error} if permissions array is empty
 * @throws {Error} if any permission value is not a valid DelegatePermission
 */
export function validateDelegateInput(
  sellerId: string,
  adminUserId: string,
  permissions: DelegatePermission[],
): void {
  if (sellerId === adminUserId) {
    throw new Error("Cannot delegate to yourself");
  }

  if (permissions.length === 0) {
    throw new Error("At least one permission is required");
  }

  for (const permission of permissions) {
    if (!DELEGATE_PERMISSIONS.includes(permission)) {
      throw new Error(`Invalid permission: ${permission}`);
    }
  }
}
