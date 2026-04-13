/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const configPath = path.resolve(__dirname, "../config/app-links.json");
const appLinkDefinitions = JSON.parse(fs.readFileSync(configPath, "utf8"));

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function joinUrl(baseUrl, pathname = "") {
  if (!pathname || pathname === "/") {
    return trimTrailingSlash(baseUrl);
  }

  return `${trimTrailingSlash(baseUrl)}${pathname}`;
}

function normalizeEnvValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getPublicOrigin(env = process.env) {
  return (
    normalizeEnvValue(env.E2E_PUBLIC_ORIGIN) ||
    normalizeEnvValue(env.SITE_PUBLIC_ORIGIN)
  );
}

function resolveFromOrigin(origin, pathname) {
  if (!origin) return "";
  return pathname === "/"
    ? trimTrailingSlash(origin)
    : joinUrl(origin, pathname);
}

function resolveUrls(target = "runtime", env = process.env) {
  const publicOrigin = getPublicOrigin(env);
  const isProduction = normalizeEnvValue(env.NODE_ENV) === "production";
  const shouldPreferPublicOrigin =
    Boolean(publicOrigin) && (target === "public" || isProduction);

  return Object.fromEntries(
    Object.entries(appLinkDefinitions).map(([app, definition]) => {
      if (target === "e2e" && normalizeEnvValue(env.E2E_PUBLIC_ORIGIN)) {
        return [app, resolveFromOrigin(publicOrigin, definition.path)];
      }

      const explicit = normalizeEnvValue(env[definition.envKey]);

      if (shouldPreferPublicOrigin) {
        return [app, resolveFromOrigin(publicOrigin, definition.path)];
      }

      if (explicit) {
        return [app, explicit];
      }

      if (target === "e2e") {
        return [
          app,
          resolveFromOrigin(publicOrigin, definition.path) || definition.devUrl,
        ];
      }

      if (target === "public") {
        return [
          app,
          resolveFromOrigin(publicOrigin, definition.path) || definition.path,
        ];
      }

      if (isProduction) {
        return [
          app,
          resolveFromOrigin(publicOrigin, definition.path) || definition.path,
        ];
      }

      return [app, definition.devUrl];
    }),
  );
}

function resolveRuntimeAppUrls(env = process.env) {
  return resolveUrls("runtime", env);
}

function resolvePublicAppUrls(env = process.env) {
  return resolveUrls("public", env);
}

function resolveE2EAppUrls(env = process.env) {
  return resolveUrls("e2e", env);
}

function getE2EExtraHTTPHeaders(env = process.env) {
  const publicOrigin = getPublicOrigin(env);
  if (!publicOrigin) {
    return {};
  }

  try {
    const { hostname } = new URL(publicOrigin);
    if (hostname.endsWith(".loca.lt")) {
      return {
        "bypass-tunnel-reminder": "true",
      };
    }
  } catch {
    return {};
  }

  return {};
}

function resolveAuthHostUrl(target = "runtime", env = process.env) {
  if (
    getPublicOrigin(env) &&
    (target === "public" || normalizeEnvValue(env.NODE_ENV) === "production")
  ) {
    return resolveUrls(target, env).auth;
  }

  const explicit = normalizeEnvValue(env.NEXT_PUBLIC_AUTH_HOST_URL);
  if (explicit) {
    return explicit;
  }

  return resolveUrls(target, env).auth;
}

module.exports = {
  appLinkDefinitions,
  getPublicOrigin,
  getE2EExtraHTTPHeaders,
  resolveAuthHostUrl,
  resolveE2EAppUrls,
  resolvePublicAppUrls,
  resolveRuntimeAppUrls,
};
