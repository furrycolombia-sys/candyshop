import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS loader script
const { loadRootEnv } = require(
  path.resolve(__dirname, "../../../../scripts/load-root-env.js"),
);
// eslint-disable-next-line @typescript-eslint/no-require-imports -- shared Node helper
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../../scripts/app-url-resolver.js"),
);
loadRootEnv({ targetEnv: process.env.TARGET_ENV });
const appUrls = resolveE2EAppUrls();

export const APP_URLS = {
  AUTH: appUrls.auth,
  STORE: appUrls.store,
  ADMIN: appUrls.admin,
  PAYMENTS: appUrls.payments,
  STUDIO: appUrls.studio,
} as const;

/** Time to wait for input debounce to fire (ms). */
export const DEBOUNCE_WAIT_MS = 1000;

/** Time to wait for a single mutation + refetch cycle (ms). */
export const MUTATION_WAIT_MS = 2000;

/** Time to wait for a bulk mutation or page reload cycle (ms). */
export const BULK_MUTATION_WAIT_MS = 3000;

/** Standard timeout for expecting elements to appear (ms). */
export const ELEMENT_TIMEOUT_MS = 10_000;

/** Extended timeout for navigation or heavy page loads (ms). */
export const NAVIGATION_TIMEOUT_MS = 15_000;

/** Extended timeout for multi-step async operations (ms). */
export const LONG_OPERATION_TIMEOUT_MS = 30_000;
