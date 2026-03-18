import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAccessToken,
  getAccessToken,
  getAccessTokenFromCookie,
  hydrateAccessTokenFromRefresh,
  setAccessToken,
} from "./accessToken";

describe("accessToken", () => {
  beforeEach(() => {
    clearAccessToken();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAccessToken / setAccessToken / clearAccessToken", () => {
    it("returns null by default", () => {
      expect(getAccessToken()).toBeNull();
    });

    it("stores and retrieves a token", () => {
      setAccessToken("my-token");
      expect(getAccessToken()).toBe("my-token");
    });

    it("overwrites a previously stored token", () => {
      setAccessToken("first");
      setAccessToken("second");
      expect(getAccessToken()).toBe("second");
    });

    it("clears the stored token", () => {
      setAccessToken("my-token");
      clearAccessToken();
      expect(getAccessToken()).toBeNull();
    });

    it("can set token to null explicitly", () => {
      setAccessToken("my-token");
      setAccessToken(null);
      expect(getAccessToken()).toBeNull();
    });
  });

  describe("getAccessTokenFromCookie", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("returns null when document is undefined (server-side)", () => {
      // In default Node env, document is undefined
      const unset: undefined = void 0;
      vi.stubGlobal("document", unset);
      expect(getAccessTokenFromCookie()).toBeNull();
    });

    it("returns token when cookie is present", () => {
      vi.stubGlobal("document", {
        cookie: "auth_access_token=abc123",
      });
      expect(getAccessTokenFromCookie()).toBe("abc123");
    });

    it("returns null when cookie is not present", () => {
      vi.stubGlobal("document", {
        cookie: "other_cookie=value",
      });
      expect(getAccessTokenFromCookie()).toBeNull();
    });

    it("returns null when cookie value is empty", () => {
      vi.stubGlobal("document", {
        cookie: "auth_access_token=",
      });
      expect(getAccessTokenFromCookie()).toBeNull();
    });

    it("finds cookie among multiple cookies", () => {
      vi.stubGlobal("document", {
        cookie: "first=one; auth_access_token=the-token; other=two",
      });
      expect(getAccessTokenFromCookie()).toBe("the-token");
    });
  });

  describe("hydrateAccessTokenFromRefresh", () => {
    it("stores access token returned by refresh endpoint", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json({ accessToken: "token-123" }, { status: 200 }),
      );

      const hydrated = await hydrateAccessTokenFromRefresh({
        authHostUrl: "/auth",
      });

      expect(hydrated).toBe(true);
      expect(getAccessToken()).toBe("token-123");
    });

    it("clears access token when refresh fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json({ ok: false }, { status: 401 }),
      );

      const hydrated = await hydrateAccessTokenFromRefresh({
        authHostUrl: "/auth",
      });

      expect(hydrated).toBe(false);
      expect(getAccessToken()).toBeNull();
    });

    it("clears access token on network error", async () => {
      setAccessToken("existing-token");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Network failure"),
      );

      const hydrated = await hydrateAccessTokenFromRefresh({
        authHostUrl: "/auth",
      });

      expect(hydrated).toBe(false);
      expect(getAccessToken()).toBeNull();
    });

    it("clears access token when payload has non-string accessToken", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json({ accessToken: 12_345 }, { status: 200 }),
      );

      const hydrated = await hydrateAccessTokenFromRefresh({
        authHostUrl: "/auth",
      });

      expect(hydrated).toBe(false);
      expect(getAccessToken()).toBeNull();
    });

    it("clears access token when payload has no accessToken field", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        Response.json({ someOtherField: "value" }, { status: 200 }),
      );

      const hydrated = await hydrateAccessTokenFromRefresh({
        authHostUrl: "/auth",
      });

      expect(hydrated).toBe(false);
      expect(getAccessToken()).toBeNull();
    });

    it("uses default authHostUrl when no input is provided", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          Response.json({ accessToken: "tok" }, { status: 200 }),
        );

      await hydrateAccessTokenFromRefresh();

      expect(fetchSpy).toHaveBeenCalledWith(
        "/auth/api/auth/refresh",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("uses default authHostUrl when input has no authHostUrl", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          Response.json({ accessToken: "tok" }, { status: 200 }),
        );

      await hydrateAccessTokenFromRefresh({});

      expect(fetchSpy).toHaveBeenCalledWith(
        "/auth/api/auth/refresh",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("strips trailing slash from authHostUrl", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          Response.json({ accessToken: "tok" }, { status: 200 }),
        );

      await hydrateAccessTokenFromRefresh({ authHostUrl: "/auth/" });

      expect(fetchSpy).toHaveBeenCalledWith(
        "/auth/api/auth/refresh",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
