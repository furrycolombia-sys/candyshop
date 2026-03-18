"use client";

import { useEffect } from "react";

import { clearAccessToken, hydrateAccessTokenFromRefresh } from "./accessToken";

export function AuthSessionBootstrap({ authHostUrl }: { authHostUrl: string }) {
  useEffect(() => {
    hydrateAccessTokenFromRefresh({ authHostUrl }).then((hydrated) => {
      if (!hydrated) {
        clearAccessToken();
      }
    });
  }, [authHostUrl]);

  return null;
}
