/** Minimal user profile summary for admin permission management */
export interface UserProfileSummary {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** A permission group for display in the admin UI */
export interface PermissionGroup {
  key: string;
  labelKey: string;
  permissions: string[];
}

/** User with their granted permission keys */
export interface UserWithPermissions {
  profile: UserProfileSummary;
  grantedKeys: string[];
}
