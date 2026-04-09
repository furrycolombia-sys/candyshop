"use client";

import { useEffect } from "react";

import {
  clearAccessToken,
  hasRefreshableAuthCookies,
  hydrateAccessTokenFromRefresh,
} from "./accessToken";

export function AuthSessionBootstrap({ authHostUrl }: { authHostUrl: string }) {
  useEffect(() => {
    if (!hasRefreshableAuthCookies()) {
      clearAccessToken();
      return;
    }

    hydrateAccessTokenFromRefresh({ authHostUrl }).then((hydrated) => {
      if (!hydrated) {
        clearAccessToken();
      }
    });
  }, [authHostUrl]);

  return null;
}
