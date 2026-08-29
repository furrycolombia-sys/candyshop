import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ClerkIdentity,
  ProfileStore,
  UserProfile,
} from "./resolveProfile";

const PROFILE_COLUMNS = "id, email, identity_sub";

/**
 * Supabase-backed ProfileStore for {@link resolveProfile}.
 *
 * Must be constructed with a service-role client: claiming and creating
 * profiles happen before the caller has an identity RLS can resolve
 * (`current_user_id()` needs `identity_sub` to already be set), and
 * `identity_sub` itself is only readable/writable by `service_role` (see
 * supabase/migrations/20260829150000_protect_identity_sub.sql and
 * .../20260829160000_protect_identity_sub_select.sql).
 */
export function createSupabaseProfileStore(
  client: SupabaseClient,
): ProfileStore {
  async function findByColumn(
    column: "identity_sub" | "email",
    value: string,
  ): Promise<UserProfile | null> {
    const { data, error } = await client
      .from("user_profiles")
      .select(PROFILE_COLUMNS)
      .eq(column, value)
      .maybeSingle();

    // A read failure is not "not found" — collapsing the two would silently
    // create a duplicate profile for somebody who already has one.
    if (error) throw new Error(`Profile lookup failed: ${error.message}`);
    return (data as UserProfile | null) ?? null;
  }

  return {
    findBySub: (sub) => findByColumn("identity_sub", sub),
    findByEmail: (email) => findByColumn("email", email),

    async claim(id, sub) {
      const { data, error } = await client
        .from("user_profiles")
        .update({ identity_sub: sub })
        .eq("id", id)
        .is("identity_sub", null) // lost race → no row, not an overwrite
        .select(PROFILE_COLUMNS)
        .maybeSingle();

      if (error) throw new Error(`Claim failed: ${error.message}`);
      if (!data)
        throw new Error(`Profile ${id} was claimed by another identity`);
      return data as UserProfile;
    },

    async create(identity: ClerkIdentity) {
      // auth.users is now permanently empty, so the trigger that used to grant
      // default buyer permissions after every auth.users insert
      // (on_auth_user_default_permissions) can never fire again. This RPC
      // inserts the profile AND grants default buyer permissions inside one
      // database function call — one PostgREST round trip, one transaction —
      // so a person can never end up with a profile but no permissions. See
      // supabase/migrations/20260829170000_profile_create_with_permissions.sql.
      // Lowercase to agree with findByEmail, which always looks up the
      // lowercased address. user_profiles_email_idx is case-sensitive, so
      // writing the raw case here would let "Rev@x.com" and "rev@x.com"
      // coexist as two profiles for the same person (see also the
      // case-insensitive unique index on lower(email) added in
      // 20260829180000_email_case_insensitive_unique.sql, which is the
      // defense-in-depth backstop if some other write path skips this).
      const email = identity.email ? identity.email.toLowerCase() : null;

      const { data, error } = await client.rpc(
        "create_profile_with_default_permissions",
        {
          p_email: email,
          p_identity_sub: identity.sub,
          p_display_name: identity.displayName,
          p_avatar_url: identity.avatarUrl,
        },
      );

      if (error) throw new Error(`Profile creation failed: ${error.message}`);
      return data as UserProfile;
    },
  };
}
