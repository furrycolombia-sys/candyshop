import { describe, it, expect, vi, afterEach } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(
    (
      _url: string,
      _key: string,
      options: { accessToken: () => Promise<string | null> },
    ) => ({ __accessToken: options.accessToken }),
  ),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

import { createBrowserSupabaseClient } from "./browser";

function getAccessTokenFn() {
  const client = createBrowserSupabaseClient() as unknown as {
    __accessToken: () => Promise<string | null>;
  };
  return client.__accessToken;
}

describe("createBrowserSupabaseClient — accessToken", () => {
  const originalClerk = globalThis.Clerk;

  afterEach(() => {
    globalThis.Clerk = originalClerk;
    vi.restoreAllMocks();
  });

  it("returns the session token without warning when Clerk is loaded and signed in", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.Clerk = {
      loaded: true,
      session: { getToken: vi.fn().mockResolvedValue("clerk-jwt") },
    };

    const token = await getAccessTokenFn()();

    expect(token).toBe("clerk-jwt");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns null without warning when Clerk is loaded but signed out — legitimate anonymous browsing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.Clerk = { loaded: true, session: null };

    const token = await getAccessTokenFn()();

    expect(token).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warns and returns null when Clerk has not been loaded onto the page yet", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.Clerk = undefined;

    const token = await getAccessTokenFn()();

    expect(token).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("warns and returns null when Clerk exists but has not finished hydrating (loaded: false)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.Clerk = { loaded: false, session: undefined };

    const token = await getAccessTokenFn()();

    expect(token).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
