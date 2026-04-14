import { MAX_INITIALS_LENGTH } from "@/features/users/domain/constants";

/** Extract up to 2-character initials from a display name or email */
export function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, MAX_INITIALS_LENGTH);
  }
  return email[0].toUpperCase();
}
