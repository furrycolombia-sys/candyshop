import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TOKEN_TTL_SECONDS } from "../domain";

import {
  AUTH_COOKIE_BASE_OPTIONS,
  AUTH_COOKIE_MAX_AGE,
  createAccessTokenCookieOptions,
  createAccessTokenSessionCookieOptions,
  createCookieOptions,
  createSessionCookieOptions,
} from "./session";

describe("session cookie utilities", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_COOKIES_SECURE", "");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("resolveSecure (tested via cookie option functions)", () => {
    it("returns false when AUTH_COOKIES_SECURE is 'false'", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "false");
      const opts = createCookieOptions(3600);
      expect(opts.secure).toBe(false);
    });

    it("returns true when AUTH_COOKIES_SECURE is 'true'", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "true");
      const opts = createCookieOptions(3600);
      expect(opts.secure).toBe(true);
    });

    it("returns true when AUTH_COOKIES_SECURE is unset and NODE_ENV is production", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "");
      vi.stubEnv("NODE_ENV", "production");
      // Empty string is falsy for the === checks, so falls through to NODE_ENV check
      // Need to delete it to truly be unset
      delete process.env.AUTH_COOKIES_SECURE;
      const opts = createCookieOptions(3600);
      expect(opts.secure).toBe(true);
    });

    it("returns false when AUTH_COOKIES_SECURE is unset and NODE_ENV is development", () => {
      delete process.env.AUTH_COOKIES_SECURE;
      vi.stubEnv("NODE_ENV", "development");
      const opts = createCookieOptions(3600);
      expect(opts.secure).toBe(false);
    });
  });

  describe("createCookieOptions", () => {
    it("returns base options with maxAge and secure flag", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "false");
      const opts = createCookieOptions(7200);

      expect(opts).toEqual({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        maxAge: 7200,
      });
    });

    it("includes httpOnly: true", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "false");
      const opts = createCookieOptions(100);
      expect(opts.httpOnly).toBe(true);
    });
  });

  describe("createSessionCookieOptions", () => {
    it("returns base options with secure flag but no maxAge", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "false");
      const opts = createSessionCookieOptions();

      expect(opts).toEqual({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      });
    });

    it("does not include maxAge property", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "false");
      const opts = createSessionCookieOptions();
      expect("maxAge" in opts).toBe(false);
    });
  });

  describe("createAccessTokenCookieOptions", () => {
    it("sets httpOnly to false so JS can read the cookie", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "false");
      const opts = createAccessTokenCookieOptions(3600);
      expect(opts.httpOnly).toBe(false);
    });

    it("includes maxAge", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "false");
      const opts = createAccessTokenCookieOptions(3600);
      expect(opts.maxAge).toBe(3600);
    });

    it("includes sameSite and path from base options", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "false");
      const opts = createAccessTokenCookieOptions(3600);
      expect(opts.sameSite).toBe("lax");
      expect(opts.path).toBe("/");
    });
  });

  describe("createAccessTokenSessionCookieOptions", () => {
    it("sets httpOnly to false", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "false");
      const opts = createAccessTokenSessionCookieOptions();
      expect(opts.httpOnly).toBe(false);
    });

    it("does not include maxAge property", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "false");
      const opts = createAccessTokenSessionCookieOptions();
      expect("maxAge" in opts).toBe(false);
    });

    it("includes sameSite and path from base options", () => {
      vi.stubEnv("AUTH_COOKIES_SECURE", "false");
      const opts = createAccessTokenSessionCookieOptions();
      expect(opts.sameSite).toBe("lax");
      expect(opts.path).toBe("/");
    });
  });

  describe("AUTH_COOKIE_BASE_OPTIONS", () => {
    it("has expected base values", () => {
      expect(AUTH_COOKIE_BASE_OPTIONS).toEqual({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    });
  });

  describe("AUTH_COOKIE_MAX_AGE", () => {
    it("has accessToken TTL matching TOKEN_TTL_SECONDS.access", () => {
      expect(AUTH_COOKIE_MAX_AGE.accessToken).toBe(TOKEN_TTL_SECONDS.access);
    });

    it("has refreshToken TTL matching TOKEN_TTL_SECONDS.refresh", () => {
      expect(AUTH_COOKIE_MAX_AGE.refreshToken).toBe(TOKEN_TTL_SECONDS.refresh);
    });

    it("access TTL is 60 minutes in seconds", () => {
      expect(AUTH_COOKIE_MAX_AGE.accessToken).toBe(3600);
    });

    it("refresh TTL is 7 days in seconds", () => {
      expect(AUTH_COOKIE_MAX_AGE.refreshToken).toBe(604_800);
    });
  });
});
