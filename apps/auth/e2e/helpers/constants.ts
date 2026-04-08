import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS loader script
const { loadRootEnv } = require(
  path.resolve(__dirname, "../../../../scripts/load-root-env.js"),
);
loadRootEnv();

export const APP_URLS = {
  AUTH: process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:5000",
  STORE: process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:5001",
  ADMIN: process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:5002",
  PAYMENTS: process.env.NEXT_PUBLIC_PAYMENTS_URL || "http://localhost:5005",
  STUDIO: process.env.NEXT_PUBLIC_STUDIO_URL || "http://localhost:5006",
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
