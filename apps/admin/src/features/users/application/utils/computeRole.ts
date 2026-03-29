import { PERMISSION_TEMPLATES } from "@/features/users/domain/constants";
import type { UserRole } from "@/features/users/domain/types";

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (const [i, element] of a.entries()) {
    if (element !== b[i]) return false;
  }
  return true;
}

/** Determine a user's role based on their granted permission keys */
export function computeRole(grantedKeys: string[]): UserRole {
  if (grantedKeys.length === 0) return "none";
  const sorted = [...grantedKeys].sort();
  if (arraysEqual(sorted, [...PERMISSION_TEMPLATES.admin].sort()))
    return "admin";
  if (arraysEqual(sorted, [...PERMISSION_TEMPLATES.seller].sort()))
    return "seller";
  if (arraysEqual(sorted, [...PERMISSION_TEMPLATES.buyer].sort()))
    return "buyer";
  return "custom";
}
