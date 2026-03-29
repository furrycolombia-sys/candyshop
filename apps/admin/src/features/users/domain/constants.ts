import type { PermissionGroup } from "./types";

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "products",
    labelKey: "products",
    permissions: [
      "products.create",
      "products.read",
      "products.update",
      "products.delete",
    ],
  },
  {
    key: "reviews",
    labelKey: "reviews",
    permissions: ["reviews.write"],
  },
  {
    key: "orders",
    labelKey: "orders",
    permissions: ["orders.place", "orders.view", "orders.manage"],
  },
  {
    key: "seller",
    labelKey: "seller",
    permissions: ["seller.payment_methods"],
  },
  {
    key: "admin",
    labelKey: "admin",
    permissions: [
      "admin.payment_types",
      "admin.templates",
      "admin.settings",
      "admin.audit",
      "admin.users",
    ],
  },
  {
    key: "events",
    labelKey: "events",
    permissions: ["events.manage", "events.read", "checkins.manage"],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap(
  (g) => g.permissions,
);

export const PERMISSION_TEMPLATES: Record<string, string[]> = {
  buyer: ["products.read", "reviews.write", "orders.place", "orders.view"],
  seller: [
    "products.read",
    "reviews.write",
    "orders.place",
    "orders.view",
    "products.create",
    "products.update",
    "products.delete",
    "orders.manage",
    "seller.payment_methods",
  ],
  admin: [...ALL_PERMISSION_KEYS],
  none: [],
};

export const USER_PERMISSIONS_QUERY_KEY = "user-permissions";
export const USERS_QUERY_KEY = "users";
export const USER_PROFILE_QUERY_KEY = "user-profile";

/** Number of users per page in the user table */
export const USERS_PER_PAGE = 20;

/** Number of columns in the user table (avatar, email, name, role, lastSeen) */
export const USER_TABLE_COLUMN_COUNT = 5;

/** Debounce time for user search filter (ms) */
export const USER_SEARCH_DEBOUNCE_MS = 300;

/** Reason stored in audit trail when permissions are changed via the admin UI */
export const ADMIN_UI_GRANT_REASON = "Admin UI";

/** PostgREST error code when .single() finds no matching row */
export const PGRST_NOT_FOUND = "PGRST116";

/** Supabase select columns for user profile summaries */
export const USER_PROFILE_SELECT_COLUMNS =
  "id, email, display_name, display_avatar_url, avatar_url, last_seen_at";

/** Maximum characters for user initials */
export const MAX_INITIALS_LENGTH = 2;

// ── Time constants for formatLastSeen ────────────────────────────────────────

/** Milliseconds per second */
export const MS_PER_SECOND = 1000;

/** Seconds per minute */
export const SECONDS_PER_MINUTE = 60;

/** Minutes per hour */
export const MINUTES_PER_HOUR = 60;

/** Hours per day */
export const HOURS_PER_DAY = 24;

/** Approximate days per month */
export const DAYS_PER_MONTH = 30;

/** Approximate days per year */
export const DAYS_PER_YEAR = 365;

/** Months per year */
export const MONTHS_PER_YEAR = 12;
