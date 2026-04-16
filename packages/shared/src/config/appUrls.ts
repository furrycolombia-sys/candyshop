// eslint-disable-next-line boundaries/no-unknown, no-restricted-imports
import appLinks from "../../../../config/app-links.json";

import { stripTrailingSlash } from "@shared/utils/url";

type AppName = keyof typeof appLinks;

function joinUrl(baseUrl: string, pathname: string) {
  if (!pathname || pathname === "/") {
    return stripTrailingSlash(baseUrl);
  }

  return `${stripTrailingSlash(baseUrl)}${pathname}`;
}

function getPublicOrigin(): string {
  return process.env.APP_PUBLIC_ORIGIN?.trim() ?? "";
}

function resolveAppUrl(app: AppName) {
  const definition = appLinks[app];
  const explicit = process.env[definition.envKey]?.trim();
  const publicOrigin = getPublicOrigin();

  if (process.env.NODE_ENV === "production") {
    if (publicOrigin) {
      return definition.path === "/"
        ? stripTrailingSlash(publicOrigin)
        : joinUrl(publicOrigin, definition.path);
    }

    if (explicit) {
      return explicit;
    }

    return definition.path;
  }

  if (explicit) {
    return explicit;
  }

  return definition.devUrl;
}

export const appUrls = Object.freeze({
  landing: resolveAppUrl("landing"),
  store: resolveAppUrl("store"),
  studio: resolveAppUrl("studio"),
  payments: resolveAppUrl("payments"),
  admin: resolveAppUrl("admin"),
  auth: resolveAppUrl("auth"),
  playground: resolveAppUrl("playground"),
});
