/** Minimal user profile summary for admin user management */
export interface UserProfileSummary {
  id: string;
  email: string;
  display_name: string | null;
  display_avatar_url: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
}

/** A permission group for display in the admin UI */
export interface PermissionGroup {
  key: string;
  labelKey: string;
  permissions: string[];
}

/** Paginated user list response */
export interface PaginatedUsers {
  users: UserProfileSummary[];
  total: number;
}

/** Computed role based on granted permission keys */
export type UserRole = "admin" | "seller" | "buyer" | "custom" | "none";
