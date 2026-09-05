import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn((...args: unknown[]) => ({
    __args: args,
  })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

import { createServiceRoleSupabaseClient } from "@api/supabase/server";

describe("createServiceRoleSupabaseClient", () => {
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    createClientMock.mockClear();
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });

  it("throws instead of silently falling back when the service-role key is not configured", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => createServiceRoleSupabaseClient()).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("creates a client authenticated with the service-role key, not the anon key", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";

    createServiceRoleSupabaseClient();

    expect(createClientMock).toHaveBeenCalledWith(
      expect.any(String),
      "service-role-secret",
    );
  });
});
