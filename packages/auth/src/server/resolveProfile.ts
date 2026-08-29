export interface UserProfile {
  id: string;
  email: string;
  identity_sub: string | null;
}

export interface ClerkIdentity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ProfileStore {
  findBySub(sub: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  claim(id: string, sub: string): Promise<UserProfile>;
  create(identity: ClerkIdentity): Promise<UserProfile>;
}

export type ResolveResult =
  | { status: "matched"; profile: UserProfile }
  | { status: "claimed"; profile: UserProfile }
  | { status: "created"; profile: UserProfile }
  | { status: "conflict"; email: string };

/**
 * Resolves a Clerk identity to a local profile, claiming a restored one if this
 * is the person's first sign-in since the migration.
 *
 * Idempotent: once claimed, later calls match on `sub` and never re-claim. That
 * matters because this runs again after a Clerk instance promotion, which
 * changes every `sub`.
 */
export async function resolveProfile(
  identity: ClerkIdentity,
  store: ProfileStore,
): Promise<ResolveResult> {
  const bySub = await store.findBySub(identity.sub);
  if (bySub) return { status: "matched", profile: bySub };

  // Only a verified address may claim an existing profile — an unverified one
  // would hand somebody else's order history to whoever typed the address.
  if (identity.email && identity.emailVerified) {
    const email = identity.email.toLowerCase();
    const byEmail = await store.findByEmail(email);

    if (byEmail) {
      if (byEmail.identity_sub === null) {
        return {
          status: "claimed",
          profile: await store.claim(byEmail.id, identity.sub),
        };
      }
      // Someone else already claimed this profile. Refuse rather than reassign.
      return { status: "conflict", email };
    }
  }

  return { status: "created", profile: await store.create(identity) };
}
