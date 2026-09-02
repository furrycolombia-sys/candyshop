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

  it("returns null WITHOUT warning when Clerk is entirely absent — apps with no <ClerkProvider> (store, admin, payments, studio) must not log on every anonymous request", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.Clerk = undefined;

    const token = await getAccessTokenFn()();

    expect(token).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("never warns across many consecutive requests when Clerk is entirely absent — this was the log-spam bug (every anonymous request, forever, in four apps)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.Clerk = undefined;

    const accessToken = getAccessTokenFn();
    const tokens = await Promise.all([
      accessToken(),
      accessToken(),
      accessToken(),
    ]);

    expect(tokens).toEqual([null, null, null]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warns and returns null when Clerk never finishes hydrating (loaded stays false)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.Clerk = { loaded: false, session: undefined };

    // This now waits for the hydration window before giving up -- see the
    // "waiting for Clerk to hydrate" suite below. The contract asserted here
    // is unchanged: if it never loads, one warning and no token.
    vi.useFakeTimers();
    let token: string | null;
    try {
      const pending = getAccessTokenFn()();
      await vi.advanceTimersByTimeAsync(30_000);
      token = await pending;
    } finally {
      vi.useRealTimers();
    }

    expect(token).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe("createBrowserSupabaseClient — waiting for Clerk to hydrate", () => {
  const originalClerk = globalThis.Clerk;

  afterEach(() => {
    globalThis.Clerk = originalClerk;
    vi.restoreAllMocks();
  });

  it("waits for Clerk to finish loading and then returns the session token", async () => {
    // The race this exists for: a signed-in user's first request fires before
    // <ClerkProvider> has hydrated. Returning null here hands supabase-js the
    // anon key, so an RLS-protected read comes back EMPTY rather than failing
    // — indistinguishable from "you have no orders".
    globalThis.Clerk = {
      loaded: false,
      session: { getToken: async () => "session-token" },
    };
    setTimeout(() => {
      globalThis.Clerk = {
        loaded: true,
        session: { getToken: async () => "session-token" },
      };
    }, 60);

    await expect(getAccessTokenFn()()).resolves.toBe("session-token");
  });

  it("returns the anonymous result once Clerk loads signed out", async () => {
    globalThis.Clerk = { loaded: false, session: null };
    setTimeout(() => {
      globalThis.Clerk = { loaded: true, session: null };
    }, 60);

    await expect(getAccessTokenFn()()).resolves.toBeNull();
  });

  it("gives up and warns if Clerk never finishes loading", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.Clerk = {
      loaded: false,
      session: { getToken: async () => "session-token" },
    };

    // Fake timers so the real hydration ceiling can stay generous without
    // costing this suite that many seconds. Advanced well past any plausible
    // value of the constant so the test does not need to know it.
    vi.useFakeTimers();
    try {
      const pending = getAccessTokenFn()();
      await vi.advanceTimersByTimeAsync(30_000);
      await expect(pending).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("does not wait when Clerk is already loaded", async () => {
    globalThis.Clerk = {
      loaded: true,
      session: { getToken: async () => "session-token" },
    };

    const started = performance.now();
    await expect(getAccessTokenFn()()).resolves.toBe("session-token");
    expect(performance.now() - started).toBeLessThan(50);
  });
});
