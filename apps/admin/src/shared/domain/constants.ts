/**
 * Permission keys that grant access to the admin application.
 * Used by the sidebar and dashboard to determine visibility.
 */
export const ADMIN_APP_ACCESS_KEYS = [
  "templates.read",
  "payment_settings.read",
  "audit.read",
  "user_permissions.read",
] as const;
