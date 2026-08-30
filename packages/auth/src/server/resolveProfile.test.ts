import { describe, it, expect, vi } from "vitest";

import { resolveProfile } from "./resolveProfile";
import type {
  ClerkIdentity,
  ProfileStore,
  UserProfile,
} from "./resolveProfile";

const PROFILE: UserProfile = {
  id: "0240da35-b657-4b9a-af7e-6b174acc3e18",
  email: "buyer@example.com",
  identity_sub: null,
};

function makeStore(overrides: Partial<ProfileStore> = {}): ProfileStore {
  return {
    findBySub: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    claim: vi.fn(async (id: string, sub: string) => ({
      ...PROFILE,
      id,
      identity_sub: sub,
    })),
    create: vi.fn(async (identity: ClerkIdentity) => ({
      id: "new-id",
      email: identity.email ?? "",
      identity_sub: identity.sub,
    })),
    ...overrides,
  };
}

const IDENTITY: ClerkIdentity = {
  sub: "user_2abc",
  email: "buyer@example.com",
  emailVerified: true,
  displayName: "Buyer",
  avatarUrl: null,
};

describe("resolveProfile", () => {
  it("matches an already-claimed profile by sub without touching email", async () => {
    const claimed = { ...PROFILE, identity_sub: "user_2abc" };
    const store = makeStore({ findBySub: vi.fn().mockResolvedValue(claimed) });

    const result = await resolveProfile(IDENTITY, store);

    expect(result).toEqual({ status: "matched", profile: claimed });
    expect(store.findByEmail).not.toHaveBeenCalled();
  });

  it("claims an unclaimed profile by verified email", async () => {
    const store = makeStore({
      findByEmail: vi.fn().mockResolvedValue(PROFILE),
    });

    const result = await resolveProfile(IDENTITY, store);

    expect(result.status).toBe("claimed");
    expect(store.claim).toHaveBeenCalledWith(PROFILE.id, "user_2abc");
  });

  it("refuses to claim on an unverified email", async () => {
    // An unverified address is an account takeover of somebody's order history.
    const store = makeStore({
      findByEmail: vi.fn().mockResolvedValue(PROFILE),
    });

    const result = await resolveProfile(
      { ...IDENTITY, emailVerified: false },
      store,
    );

    expect(result.status).toBe("created");
    expect(store.claim).not.toHaveBeenCalled();
  });

  it("reports a conflict when the profile belongs to a different identity", async () => {
    const taken = { ...PROFILE, identity_sub: "user_someone_else" };
    const store = makeStore({ findByEmail: vi.fn().mockResolvedValue(taken) });

    const result = await resolveProfile(IDENTITY, store);

    expect(result).toEqual({ status: "conflict", email: "buyer@example.com" });
    expect(store.claim).not.toHaveBeenCalled();
  });

  it("creates a profile when nothing matches", async () => {
    const store = makeStore();

    const result = await resolveProfile(IDENTITY, store);

    expect(result.status).toBe("created");
    expect(store.create).toHaveBeenCalledWith(IDENTITY);
  });

  it("matches case-insensitively on email", async () => {
    const store = makeStore({
      findByEmail: vi.fn().mockResolvedValue(PROFILE),
    });

    await resolveProfile({ ...IDENTITY, email: "Buyer@Example.COM" }, store);

    expect(store.findByEmail).toHaveBeenCalledWith("buyer@example.com");
  });

  it("is a no-op the second time, so it can be re-run after a Clerk promotion", async () => {
    // A stateful fake, not a fixed stub: call 1 must find the profile
    // UNCLAIMED and actually claim it, mutating state, so call 2 can only
    // pass by matching on the sub that claim() persisted. A store whose
    // claim() silently failed to persist identity_sub would still find the
    // profile unclaimed on call 2 and re-claim it — this is the property a
    // stub that "always returns claimed" can never catch.
    let profile: UserProfile = { ...PROFILE };
    const store: ProfileStore = {
      findBySub: vi.fn(async (sub) =>
        profile.identity_sub === sub ? profile : null,
      ),
      findByEmail: vi.fn(async (email) =>
        profile.email === email ? profile : null,
      ),
      claim: vi.fn(async (id, sub) => {
        profile = { ...profile, id, identity_sub: sub };
        return profile;
      }),
      create: vi.fn(async () => {
        throw new Error("create must not be called: the profile exists");
      }),
    };

    const first = await resolveProfile(IDENTITY, store);
    const second = await resolveProfile(IDENTITY, store);

    expect(first).toEqual({ status: "claimed", profile });
    expect(second).toEqual({ status: "matched", profile });
    expect(store.claim).toHaveBeenCalledTimes(1);
  });

  it("returns a typed result instead of crashing when the identity has no email at all", async () => {
    // user_profiles.email is NOT NULL. A phone-only or no-email-scope Clerk
    // identity must get a result the caller can act on, not an opaque
    // "Profile creation failed: null value in column email..." from the
    // database's NOT NULL constraint.
    const store = makeStore();

    const result = await resolveProfile(
      { ...IDENTITY, email: null, emailVerified: false },
      store,
    );

    expect(result).toEqual({ status: "email_required" });
    expect(store.create).not.toHaveBeenCalled();
    expect(store.findByEmail).not.toHaveBeenCalled();
  });

  it("propagates a real duplicate-key failure instead of silently mislabelling it as created", async () => {
    // In production, an unverified email that collides with an existing
    // profile's email reaches store.create(), which hits
    // user_profiles_email_lower_idx (see
    // 20260829180000_email_case_insensitive_unique.sql) and rejects with a
    // duplicate-key error. This is fail-closed — nobody's data is exposed —
    // but it must surface as a rejected promise, not get swallowed into a
    // false "created" result.
    const store = makeStore({
      findByEmail: vi.fn().mockResolvedValue(PROFILE),
      create: vi
        .fn()
        .mockRejectedValue(
          new Error(
            'Profile creation failed: duplicate key value violates unique constraint "user_profiles_email_lower_idx"',
          ),
        ),
    });

    await expect(
      resolveProfile({ ...IDENTITY, emailVerified: false }, store),
    ).rejects.toThrow(/user_profiles_email_lower_idx/);
  });
});
