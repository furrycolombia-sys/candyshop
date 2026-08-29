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
    const claimed = { ...PROFILE, identity_sub: "user_2abc" };
    const store = makeStore({ findBySub: vi.fn().mockResolvedValue(claimed) });

    const first = await resolveProfile(IDENTITY, store);
    const second = await resolveProfile(IDENTITY, store);

    expect(first).toEqual(second);
    expect(store.claim).not.toHaveBeenCalled();
  });
});
