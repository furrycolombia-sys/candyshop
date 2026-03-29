"use client";

import { UserRow } from "./UserRow";

import { useUserPermissions } from "@/features/users/application/hooks/useUserPermissions";
import { computeRole } from "@/features/users/application/utils";
import type { UserProfileSummary } from "@/features/users/domain/types";

interface UserRowWithRoleProps {
  user: UserProfileSummary;
  onClick: (userId: string) => void;
}

/** Row that fetches permissions for a single user to compute role */
export function UserRowWithRole({ user, onClick }: UserRowWithRoleProps) {
  const { data: grantedKeys = [] } = useUserPermissions(user.id);
  const role = computeRole(grantedKeys);

  return <UserRow user={user} role={role} onClick={onClick} />;
}
