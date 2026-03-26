import { z } from "zod";

const MAX_DISPLAY_NAME_LENGTH = 100;

/** User profile row from public.user_profiles */
export interface UserProfile {
  id: string;
  email: string;
  avatar_url: string | null;
  provider: string | null;
  display_name: string | null;
  display_email: string | null;
  display_avatar_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

/** Editable fields for the profile form */
export const profileFormSchema = z.object({
  display_name: z
    .string()
    .max(MAX_DISPLAY_NAME_LENGTH)
    .optional()
    .transform((v) => v?.trim() || null),
  display_email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => v?.trim() || null),
  display_avatar_url: z
    .string()
    .url()
    .startsWith("https://")
    .optional()
    .or(z.literal(""))
    .transform((v) => v?.trim() || null),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
