"use client";

import {
  setAccessTokenGetter,
  setOnUnauthorized,
  setRefreshTokenCallback,
} from "api";
import {
  AUTH_COOKIE_NAMES,
  getAccessTokenFromCookie,
  TOKEN_TTL_SECONDS,
} from "auth";
import { useEffect } from "react";

const DEFAULT_LOCALE = "en";

async function doRefresh(authHostUrl: string): Promise<boolean> {
  const base = authHostUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { ok?: boolean; accessToken?: unknown };
  const token =
    typeof data.accessToken === "string" && data.accessToken.length > 0
      ? data.accessToken
      : null;
  if (token === null) return false;
  const maxAge = TOKEN_TTL_SECONDS.access;
  const value = encodeURIComponent(token);
  const secure =
    globalThis.location !== undefined &&
    globalThis.location.protocol === "https:";
  /* eslint-disable unicorn/no-document-cookie, i18next/no-literal-string */
  document.cookie = `${AUTH_COOKIE_NAMES.accessToken}=${value}; path=/; max-age=${maxAge}; samesite=lax${secure ? "; secure" : ""}`;
  /* eslint-enable unicorn/no-document-cookie, i18next/no-literal-string */
  return true;
}

/**
 * Registers API auth: Bearer token from cookie, 401 refresh+retry, then redirect to login.
 */
export function ApiAuthBootstrap({ authHostUrl }: { authHostUrl: string }) {
  useEffect(() => {
    setAccessTokenGetter(() => getAccessTokenFromCookie());
    setRefreshTokenCallback(() => doRefresh(authHostUrl));

    setOnUnauthorized(() => {
      if (globalThis.window === undefined) return;
      const returnTo = encodeURIComponent(globalThis.location.href);
      // eslint-disable-next-line i18next/no-literal-string
      const suffix = returnTo.length > 0 ? `?returnTo=${returnTo}` : "";
      const loginPath = `/${DEFAULT_LOCALE}/login${suffix}`;
      const isAbsolute = /^https?:\/\//.test(authHostUrl);
      const base = authHostUrl.startsWith("/")
        ? authHostUrl
        : `/${authHostUrl}`;
      const loginUrl = isAbsolute
        ? new URL(loginPath, authHostUrl).toString()
        : `${globalThis.location.origin}${base}${loginPath}`;
      globalThis.location.href = loginUrl;
    });

    return () => {
      setAccessTokenGetter(null);
      setRefreshTokenCallback(null);
      setOnUnauthorized(null);
    };
  }, [authHostUrl]);

  return null;
}
