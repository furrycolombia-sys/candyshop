"use client";

import { AppNavigation, type AppId } from "@monorepo/app-components";
import { useCurrentUserPermissions } from "auth/client";

type AppTopNavigationProps = {
  currentApp: AppId;
  urls: Record<AppId, string>;
  locales: readonly string[];
  userEmail?: string | null;
};

export function AppTopNavigation({
  currentApp,
  locales,
  urls,
  userEmail,
}: AppTopNavigationProps) {
  const permissionState = useCurrentUserPermissions();

  return (
    <AppNavigation
      currentApp={currentApp}
      locales={locales}
      urls={urls}
      userEmail={userEmail}
      permissionState={permissionState}
    />
  );
}
