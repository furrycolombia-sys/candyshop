// @vitest-environment jsdom

import type { SupabaseClient } from "@supabase/supabase-js";
import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "./useAuth";

function createMockSubscription() {
  return { unsubscribe: vi.fn() };
}

function createMockSupabaseClient(overrides?: {
  getSession?: () => Promise<unknown>;
  getUser?: () => Promise<unknown>;
  onAuthStateChange?: (cb: (event: string, session: unknown) => void) => {
    data: { subscription: { unsubscribe: () => void } };
  };
  signInWithOAuth?: () => Promise<unknown>;
  signOut?: () => Promise<unknown>;
}) {
  const subscription = createMockSubscription();

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription },
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      ...overrides,
    },
    _subscription: subscription,
  };
}

type MockClient = ReturnType<typeof createMockSupabaseClient>;

function asSupabase(client: MockClient): SupabaseClient {
  return client as unknown as SupabaseClient;
}

const mockSession = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "user-id",
    email: "user@example.com",
    aud: "authenticated",
    role: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
  },
};

describe("useAuth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial loading state", () => {
    it("starts with isLoading true and no session", () => {
      const client = createMockSupabaseClient({
        getSession: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
      });
      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("session loaded from getSession", () => {
    it("sets session and user when getSession returns a valid session", async () => {
      const client = createMockSupabaseClient();
      client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: mockSession },
      });
      client.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: mockSession.user },
        error: null,
      });

      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("sets session to null and isLoading false when getSession returns no session", async () => {
      const client = createMockSupabaseClient();
      client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: null },
      });

      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("getUser failure clears session", () => {
    it("clears session when getUser returns an error", async () => {
      const client = createMockSupabaseClient();
      client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: mockSession },
      });
      client.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error("JWT expired"),
      });

      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("clears session when getUser returns no user", async () => {
      const client = createMockSupabaseClient();
      client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: mockSession },
      });
      client.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("onAuthStateChange updates session", () => {
    it("updates session when onAuthStateChange fires with a new session", async () => {
      let capturedCallback: ((event: string, session: unknown) => void) | null =
        null;

      const client = createMockSupabaseClient();
      client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: null },
      });
      client.auth.onAuthStateChange = vi.fn().mockImplementation((cb) => {
        capturedCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toBeNull();

      await act(async () => {
        capturedCallback?.("SIGNED_IN", mockSession);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("clears session when onAuthStateChange fires with null session", async () => {
      let capturedCallback: ((event: string, session: unknown) => void) | null =
        null;

      const client = createMockSupabaseClient();
      client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: mockSession },
      });
      client.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: mockSession.user },
        error: null,
      });
      client.auth.onAuthStateChange = vi.fn().mockImplementation((cb) => {
        capturedCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      await act(async () => {
        capturedCallback?.("SIGNED_OUT", null);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("signInWithProvider", () => {
    beforeEach(() => {
      vi.stubGlobal("location", {
        origin: "https://example.com",
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("calls signInWithOAuth with the given provider", async () => {
      const client = createMockSupabaseClient();

      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await act(async () => {
        await result.current.signInWithProvider("google");
      });

      expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "https://example.com/auth/callback",
        },
      });
    });

    it("uses the provided redirectTo URL when supplied", async () => {
      const client = createMockSupabaseClient();

      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await act(async () => {
        await result.current.signInWithProvider(
          "discord",
          "https://example.com/custom-callback",
        );
      });

      expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "discord",
        options: {
          redirectTo: "https://example.com/custom-callback",
        },
      });
    });

    it("throws when signInWithOAuth returns an error", async () => {
      const client = createMockSupabaseClient();
      const authError = new Error("OAuth failed");
      client.auth.signInWithOAuth = vi
        .fn()
        .mockResolvedValue({ error: authError });

      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await expect(
        act(async () => {
          await result.current.signInWithProvider("google");
        }),
      ).rejects.toThrow("OAuth failed");
    });
  });

  describe("signOut", () => {
    it("calls supabase.auth.signOut", async () => {
      const client = createMockSupabaseClient();

      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await act(async () => {
        await result.current.signOut();
      });

      expect(client.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it("throws when signOut returns an error", async () => {
      const client = createMockSupabaseClient();
      const signOutError = new Error("Sign out failed");
      client.auth.signOut = vi.fn().mockResolvedValue({ error: signOutError });

      const { result } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await expect(
        act(async () => {
          await result.current.signOut();
        }),
      ).rejects.toThrow("Sign out failed");
    });
  });

  describe("effect cleanup", () => {
    it("calls subscription.unsubscribe on unmount", async () => {
      const unsubscribe = vi.fn();
      const client = createMockSupabaseClient();
      client.auth.onAuthStateChange = vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe } },
      });

      const { unmount } = renderHook(() =>
        useAuth({ supabaseClient: asSupabase(client) }),
      );

      await waitFor(() => {
        expect(client.auth.onAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
