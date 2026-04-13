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
      "product_images.create",
      "product_images.read",
      "product_images.delete",
    ],
  },
  {
    key: "reviews",
    labelKey: "reviews",
    permissions: [
      "product_reviews.create",
      "product_reviews.read",
      "product_reviews.update",
      "product_reviews.delete",
    ],
  },
  {
    key: "orders",
    labelKey: "orders",
    permissions: [
      "orders.create",
      "orders.read",
      "orders.update",
      "receipts.create",
      "receipts.read",
      "receipts.delete",
    ],
  },
  {
    key: "seller",
    labelKey: "seller",
    permissions: [
      "seller_payment_methods.create",
      "seller_payment_methods.read",
      "seller_payment_methods.update",
      "seller_payment_methods.delete",
    ],
  },
  {
    key: "adminCatalog",
    labelKey: "adminCatalog",
    permissions: [
      "templates.create",
      "templates.read",
      "templates.update",
      "templates.delete",
    ],
  },
  {
    key: "adminConfig",
    labelKey: "adminConfig",
    permissions: [
      "payment_settings.read",
      "payment_settings.update",
      "audit.read",
    ],
  },
  {
    key: "adminUsers",
    labelKey: "adminUsers",
    permissions: [
      "user_permissions.create",
      "user_permissions.read",
      "user_permissions.update",
      "user_permissions.delete",
    ],
  },
  {
    key: "events",
    labelKey: "events",
    permissions: [
      "events.create",
      "events.read",
      "events.update",
      "events.delete",
    ],
  },
  {
    key: "checkins",
    labelKey: "checkins",
    permissions: ["check_ins.create", "check_ins.read", "check_ins.update"],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap(
  (group) => group.permissions,
);

export const PERMISSION_TEMPLATES: Record<string, string[]> = {
  buyer: [
    "products.read",
    "product_images.read",
    "product_reviews.create",
    "product_reviews.read",
    "product_reviews.update",
    "product_reviews.delete",
    "orders.create",
    "orders.read",
    "receipts.create",
    "receipts.delete",
  ],
  seller: [
    "products.read",
    "product_images.read",
    "product_reviews.read",
    "orders.read",
    "receipts.read",
    "products.create",
    "products.update",
    "products.delete",
    "product_images.create",
    "product_images.delete",
    "orders.update",
    "seller_payment_methods.create",
    "seller_payment_methods.read",
    "seller_payment_methods.update",
    "seller_payment_methods.delete",
  ],
  admin: ALL_PERMISSION_KEYS,
  events: [
    "events.read",
    "events.create",
    "events.update",
    "events.delete",
    "check_ins.create",
    "check_ins.read",
    "check_ins.update",
  ],
  none: [],
};

export const ADMIN_APP_ACCESS_KEYS = [
  "templates.read",
  "payment_settings.read",
  "audit.read",
  "user_permissions.read",
] as const;

export const USER_PERMISSIONS_QUERY_KEY = "user-permissions";
export const USERS_QUERY_KEY = "users";
export const USER_PROFILE_QUERY_KEY = "user-profile";

/** Number of users per page in the user table */
export const USERS_PER_PAGE = 20;

/** Number of columns in the user table (avatar, email, name, role, lastSeen) */
export const USER_TABLE_COLUMN_COUNT = 6;

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

export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_MONTH = 30;
export const DAYS_PER_YEAR = 365;
export const MONTHS_PER_YEAR = 12;
