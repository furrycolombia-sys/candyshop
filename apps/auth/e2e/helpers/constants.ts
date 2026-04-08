// ─── App URLs ────────────────────────────────────────────────────
export const APP_URLS = {
  AUTH: "http://localhost:5000",
  STORE: "http://localhost:5001",
  ADMIN: "http://localhost:5002",
  PAYMENTS: "http://localhost:5005",
  STUDIO: "http://localhost:5006",
} as const;

// ─── E2E Timing Constants ────────────────────────────────────────
/** Time to wait for input debounce to fire (ms). */
export const DEBOUNCE_WAIT_MS = 1000;

/** Time to wait for a single mutation + refetch cycle (ms). */
export const MUTATION_WAIT_MS = 2000;

/** Time to wait for a bulk mutation or page reload cycle (ms). */
export const BULK_MUTATION_WAIT_MS = 3000;

// ─── E2E Timeout Constants ───────────────────────────────────────
/** Standard timeout for expecting elements to appear (ms). */
export const ELEMENT_TIMEOUT_MS = 10_000;

/** Extended timeout for navigation or heavy page loads (ms). */
export const NAVIGATION_TIMEOUT_MS = 15_000;

/** Extended timeout for multi-step async operations (ms). */
export const LONG_OPERATION_TIMEOUT_MS = 30_000;
