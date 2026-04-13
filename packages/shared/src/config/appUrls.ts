// eslint-disable-next-line boundaries/no-unknown, no-restricted-imports
import appLinks from "../../../../config/app-links.json";

type AppName = keyof typeof appLinks;

function trimTrailingSlash(value: string) {
  // eslint-disable-next-line sonarjs/slow-regex
  return value.replace(/\/+$/, "");
}

function joinUrl(baseUrl: string, pathname: string) {
  if (!pathname || pathname === "/") {
    return trimTrailingSlash(baseUrl);
  }

  return `${trimTrailingSlash(baseUrl)}${pathname}`;
}

function getPublicOrigin() {
  const fromE2E = process.env.E2E_PUBLIC_ORIGIN?.trim();
  const fromSite = process.env.SITE_PUBLIC_ORIGIN?.trim();
  return fromE2E || fromSite || "";
}

function resolveAppUrl(app: AppName) {
  const definition = appLinks[app];
  const explicit = process.env[definition.envKey]?.trim();
  const publicOrigin = getPublicOrigin();

  if (process.env.NODE_ENV === "production") {
    if (publicOrigin) {
      return definition.path === "/"
        ? trimTrailingSlash(publicOrigin)
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
