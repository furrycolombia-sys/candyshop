import { describe, it, expect, vi } from "vitest";

import { fetchProfile, updateProfile } from "./profileQueries";

function createMockSupabase(data: unknown, error: unknown = null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue({ data, error }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({ data, error }),
          }),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("fetchProfile", () => {
  it("returns profile data", async () => {
    const mock = { id: "u1", display_name: "John" };
    const supabase = createMockSupabase(mock);

    const result = await fetchProfile(supabase, "u1");
    expect(result).toEqual(mock);
    expect(supabase.from).toHaveBeenCalledWith("user_profiles");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase(null, new Error("not found"));

    await expect(fetchProfile(supabase, "u1")).rejects.toThrow("not found");
  });
});

describe("updateProfile", () => {
  it("returns updated profile", async () => {
    const mock = { id: "u1", display_name: "Updated" };
    const supabase = createMockSupabase(mock);

    const result = await updateProfile(supabase, "u1", {
      display_name: "Updated",
      display_email: null,
      display_avatar_url: null,
    });
    expect(result).toEqual(mock);
    expect(supabase.from).toHaveBeenCalledWith("user_profiles");
  });

  it("throws on error", async () => {
    const supabase = createMockSupabase(null, new Error("update failed"));

    await expect(
      updateProfile(supabase, "u1", {
        display_name: "X",
        display_email: null,
        display_avatar_url: null,
      }),
    ).rejects.toThrow("update failed");
  });
});
