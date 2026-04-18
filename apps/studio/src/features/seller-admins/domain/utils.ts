/**
 * Returns the display name for a user profile, falling back to email.
 */
export function getDisplayName(profile: {
  display_name: string | null;
  email: string;
}): string {
  return profile.display_name ?? profile.email;
}
