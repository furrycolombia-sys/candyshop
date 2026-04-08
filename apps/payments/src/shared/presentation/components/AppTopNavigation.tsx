"use client";

import { AppNavigation, type AppId } from "@monorepo/app-components";
import { useCurrentUserPermissions } from "auth/client";

interface AppTopNavigationProps {
  currentApp: AppId;
  urls: Record<AppId, string>;
  locales: readonly string[];
  userEmail?: string | null;
}

export function AppTopNavigation(props: AppTopNavigationProps) {
  const { grantedKeys, isLoading } = useCurrentUserPermissions();
  const permissionState = { grantedKeys, isLoading };

  return <AppNavigation permissionState={permissionState} {...props} />;
}
