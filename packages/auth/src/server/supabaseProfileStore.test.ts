import { describe, it, expect, vi } from "vitest";

import type { ClerkIdentity } from "./resolveProfile";
import { createSupabaseProfileStore } from "./supabaseProfileStore";

function makeSelectClient(row: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const is = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({
    maybeSingle,
    is,
    select: () => ({ maybeSingle }),
  }));
  const select = vi.fn(() => ({ eq }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select, update }));
  const rpc = vi.fn();
  return {
    client: { from, rpc },
    from,
    select,
    eq,
    update,
    is,
    maybeSingle,
    rpc,
  };
}

const IDENTITY: ClerkIdentity = {
  sub: "user_2abc",
  email: "buyer@example.com",
  emailVerified: true,
  displayName: "Buyer",
  avatarUrl: null,
};

describe("createSupabaseProfileStore", () => {
  it("looks a profile up by identity_sub", async () => {
    const { client, from, eq } = makeSelectClient({
      id: "abc",
      email: "a@b.com",
      identity_sub: "user_2abc",
    });

    const profile = await createSupabaseProfileStore(client as never).findBySub(
      "user_2abc",
    );

    expect(from).toHaveBeenCalledWith("user_profiles");
    expect(eq).toHaveBeenCalledWith("identity_sub", "user_2abc");
    expect(profile).toEqual({
      id: "abc",
      email: "a@b.com",
      identity_sub: "user_2abc",
    });
  });

  it("returns null when no profile matches by sub", async () => {
    const { client } = makeSelectClient(null);

    const profile = await createSupabaseProfileStore(client as never).findBySub(
      "user_nobody",
    );

    expect(profile).toBeNull();
  });

  it("looks a profile up by email", async () => {
    const { client, from, eq } = makeSelectClient({
      id: "abc",
      email: "buyer@example.com",
      identity_sub: null,
    });

    const profile = await createSupabaseProfileStore(
      client as never,
    ).findByEmail("buyer@example.com");

    expect(from).toHaveBeenCalledWith("user_profiles");
    expect(eq).toHaveBeenCalledWith("email", "buyer@example.com");
    expect(profile).toEqual({
      id: "abc",
      email: "buyer@example.com",
      identity_sub: null,
    });
  });

  it("throws on a read failure instead of treating it as not-found", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    await expect(
      createSupabaseProfileStore({ from } as never).findBySub("user_2abc"),
    ).rejects.toThrow(/Profile lookup failed/);
  });

  it("claims an unclaimed profile by id, guarding against a lost race", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "abc",
        email: "buyer@example.com",
        identity_sub: "user_2abc",
      },
      error: null,
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const is = vi.fn(() => ({ select }));
    const eq = vi.fn(() => ({ is }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    const profile = await createSupabaseProfileStore({ from } as never).claim(
      "abc",
      "user_2abc",
    );

    expect(update).toHaveBeenCalledWith({ identity_sub: "user_2abc" });
    expect(eq).toHaveBeenCalledWith("id", "abc");
    expect(is).toHaveBeenCalledWith("identity_sub", null);
    expect(profile).toEqual({
      id: "abc",
      email: "buyer@example.com",
      identity_sub: "user_2abc",
    });
  });

  it("throws if the profile was claimed by someone else between findByEmail and claim", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const is = vi.fn(() => ({ select }));
    const eq = vi.fn(() => ({ is }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    await expect(
      createSupabaseProfileStore({ from } as never).claim("abc", "user_2abc"),
    ).rejects.toThrow(/claimed by another identity/);
  });

  it("creates a profile via the atomic RPC that also grants default buyer permissions", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "new-id",
        email: "buyer@example.com",
        identity_sub: "user_2abc",
      },
      error: null,
    });

    const profile = await createSupabaseProfileStore({ rpc } as never).create(
      IDENTITY,
    );

    // The permission grant MUST happen inside the same DB function call as the
    // insert (a single RPC = one transaction) — see
    // supabase/migrations/20260829170000_profile_create_with_permissions.sql.
    // Two separate client calls (insert, then a second rpc) would not share a
    // transaction, so this must be exactly one call.
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "create_profile_with_default_permissions",
      {
        p_email: "buyer@example.com",
        p_identity_sub: "user_2abc",
        p_display_name: "Buyer",
        p_avatar_url: null,
      },
    );
    expect(profile).toEqual({
      id: "new-id",
      email: "buyer@example.com",
      identity_sub: "user_2abc",
    });
  });

  it("throws on a creation failure", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(
      createSupabaseProfileStore({ rpc } as never).create(IDENTITY),
    ).rejects.toThrow(/Profile creation failed/);
  });
});
