/**
 * Resolves app URLs for E2E tests and Playwright configs.
 *
 * Reads APP_PUBLIC_ORIGIN from the active env file (loaded by load-root-env.js).
 * If set, derives each app URL by joining the origin with the app's path.
 * Falls back to NEXT_PUBLIC_*_URL env vars, then to devUrl from app-links.json.
 *
 * No E2E mode detection. No isE2EMode flag. The env file IS the configuration.
 * To run E2E against prod, load .env.prod — no code changes needed.
 */

// @ts-check
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadRootEnv } = require(path.resolve(__dirname, "./load-root-env.js"));
loadRootEnv({ targetEnv: process.env.TARGET_ENV });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const appLinks = require("../config/app-links.json");

/**
 * @param {string} s
 * @returns {string}
 */
function stripTrailingSlash(s) {
  return s.replace(/\/+$/, "");
}

/**
 * Resolves all app URLs for the active environment.
 *
 * Resolution order:
 *   1. APP_PUBLIC_ORIGIN + app.path  (when APP_PUBLIC_ORIGIN is set)
 *   2. NEXT_PUBLIC_<APP>_URL         (per-app override)
 *   3. app.devUrl                    (hardcoded localhost port from app-links.json)
 *
 * @returns {Record<string, string>}
 */
function resolveE2EAppUrls() {
  const rawOrigin = process.env.APP_PUBLIC_ORIGIN?.trim() ?? "";
  const publicOrigin = rawOrigin ? stripTrailingSlash(rawOrigin) : null;

  /** @type {Record<string, string>} */
  const result = {};

  for (const [name, app] of Object.entries(appLinks)) {
    if (publicOrigin) {
      result[name] =
        app.path === "/" ? publicOrigin : `${publicOrigin}${app.path}`;
    } else {
      result[name] = process.env[app.envKey] ?? app.devUrl;
    }
  }

  return result;
}

/**
 * Returns extra HTTP headers for Playwright requests.
 * No E2E-specific headers needed — returns an empty object.
 *
 * @returns {Record<string, string>}
 */
function getE2EExtraHTTPHeaders() {
  return {};
}

module.exports = { resolveE2EAppUrls, getE2EExtraHTTPHeaders };
