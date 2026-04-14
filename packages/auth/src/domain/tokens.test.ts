import { describe, expect, it } from "vitest";

import {
  createMockSessionTokens,
  decodeAuthToken,
  encodeAuthToken,
  getSessionState,
  isTokenActive,
  TOKEN_TTL_SECONDS,
} from "./tokens";

describe("auth tokens", () => {
  const fixedNow = new Date("2026-02-17T12:00:00.000Z").getTime();

  it("creates active access and refresh tokens", () => {
    const tokens = createMockSessionTokens({ nowMs: fixedNow });

    expect(isTokenActive(tokens.accessToken, fixedNow)).toBe(true);
    expect(isTokenActive(tokens.refreshToken, fixedNow)).toBe(true);
  });

  it("creates tokens with expected expiry windows", () => {
    const tokens = createMockSessionTokens({ nowMs: fixedNow });
    const accessPayload = decodeAuthToken(tokens.accessToken);
    const refreshPayload = decodeAuthToken(tokens.refreshToken);

    expect(accessPayload).not.toBeNull();
    expect(refreshPayload).not.toBeNull();

    if (!accessPayload || !refreshPayload) {
      throw new Error("Token payload should exist");
    }

    expect(accessPayload.exp - accessPayload.iat).toBe(
      TOKEN_TTL_SECONDS.access,
    );
    expect(refreshPayload.exp - refreshPayload.iat).toBe(
      TOKEN_TTL_SECONDS.refresh,
    );
  });

  it("returns unauthenticated state when both tokens are invalid", () => {
    const state = getSessionState(
      {
        accessToken: "bad-token",
        refreshToken: "bad-token",
      },
      fixedNow,
    );

    expect(state.isAuthenticated).toBe(false);
    expect(state.hasValidAccessToken).toBe(false);
    expect(state.hasValidRefreshToken).toBe(false);
    expect(state.requiresRefresh).toBe(false);
  });

  it("requires refresh when access is expired but refresh is still valid", () => {
    const tokens = createMockSessionTokens({ nowMs: fixedNow });
    const accessExpiredNow = fixedNow + (TOKEN_TTL_SECONDS.access + 1) * 1000;

    const state = getSessionState(
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      accessExpiredNow,
    );

    expect(state.hasValidAccessToken).toBe(false);
    expect(state.hasValidRefreshToken).toBe(true);
    expect(state.requiresRefresh).toBe(true);
    expect(state.isAuthenticated).toBe(true);
  });

  it("rotates refresh token identity between sessions", () => {
    const first = createMockSessionTokens({ nowMs: fixedNow });
    const second = createMockSessionTokens({ nowMs: fixedNow + 1000 });

    const firstRefresh = decodeAuthToken(first.refreshToken);
    const secondRefresh = decodeAuthToken(second.refreshToken);

    expect(firstRefresh).not.toBeNull();
    expect(secondRefresh).not.toBeNull();

    if (!firstRefresh || !secondRefresh) {
      throw new Error("Refresh payload should exist");
    }

    expect(firstRefresh.jti).not.toBe(secondRefresh.jti);
  });
});

describe("decodeAuthToken edge cases", () => {
  it("returns null for completely invalid base64", () => {
    expect(decodeAuthToken("!!!not-base64!!!")).toBeNull();
  });

  it("returns null when decoded value is a string, not an object", () => {
    // btoa('"hello"') encodes a JSON string primitive
    const encoded = btoa('"hello"')
      .replaceAll("=", "")
      .replaceAll("+", "-")
      .replaceAll("/", "_");
    expect(decodeAuthToken(encoded)).toBeNull();
  });

  it("returns null when decoded value is null", () => {
    const encoded = btoa("null")
      .replaceAll("=", "")
      .replaceAll("+", "-")
      .replaceAll("/", "_");
    expect(decodeAuthToken(encoded)).toBeNull();
  });

  it("returns null when payload is missing required fields", () => {
    const incomplete = { type: "access", sub: "user-1" };
    const encoded = btoa(JSON.stringify(incomplete))
      .replaceAll("=", "")
      .replaceAll("+", "-")
      .replaceAll("/", "_");
    expect(decodeAuthToken(encoded)).toBeNull();
  });

  it("returns null when type is invalid", () => {
    const payload = {
      type: "invalid",
      sub: "user-1",
      role: "admin",
      iat: 1000,
      exp: 2000,
      jti: "abc",
    };
    const encoded = btoa(JSON.stringify(payload))
      .replaceAll("=", "")
      .replaceAll("+", "-")
      .replaceAll("/", "_");
    expect(decodeAuthToken(encoded)).toBeNull();
  });

  it("returns null when role is invalid", () => {
    const payload = {
      type: "access",
      sub: "user-1",
      role: "superadmin",
      iat: 1000,
      exp: 2000,
      jti: "abc",
    };
    const encoded = btoa(JSON.stringify(payload))
      .replaceAll("=", "")
      .replaceAll("+", "-")
      .replaceAll("/", "_");
    expect(decodeAuthToken(encoded)).toBeNull();
  });

  it("returns null when iat is not a number", () => {
    const payload = {
      type: "access",
      sub: "user-1",
      role: "admin",
      iat: "not-a-number",
      exp: 2000,
      jti: "abc",
    };
    const encoded = btoa(JSON.stringify(payload))
      .replaceAll("=", "")
      .replaceAll("+", "-")
      .replaceAll("/", "_");
    expect(decodeAuthToken(encoded)).toBeNull();
  });

  it("returns null when name is a non-string truthy value", () => {
    const payload = {
      type: "access",
      sub: "user-1",
      role: "admin",
      iat: 1000,
      exp: 2000,
      jti: "abc",
      name: 42,
    };
    const encoded = btoa(JSON.stringify(payload))
      .replaceAll("=", "")
      .replaceAll("+", "-")
      .replaceAll("/", "_");
    expect(decodeAuthToken(encoded)).toBeNull();
  });

  it("succeeds when name is undefined", () => {
    const payload = {
      type: "access",
      sub: "user-1",
      role: "viewer",
      iat: 1000,
      exp: 2000,
      jti: "abc",
    };
    const encoded = btoa(JSON.stringify(payload))
      .replaceAll("=", "")
      .replaceAll("+", "-")
      .replaceAll("/", "_");
    const decoded = decodeAuthToken(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe("user-1");
    expect(decoded?.role).toBe("viewer");
  });
});

describe("isTokenActive with standard JWT format", () => {
  const fixedNow = new Date("2026-02-17T12:00:00.000Z").getTime();
  const nowInSeconds = Math.floor(fixedNow / 1000);

  function makeStandardJwt(exp: number): string {
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ sub: "user-1", exp }));
    const signature = "fake-signature";
    return `${header}.${payload}.${signature}`;
  }

  it("returns true for a standard JWT with future exp", () => {
    const jwt = makeStandardJwt(nowInSeconds + 3600);
    expect(isTokenActive(jwt, fixedNow)).toBe(true);
  });

  it("returns false for a standard JWT with past exp", () => {
    const jwt = makeStandardJwt(nowInSeconds - 100);
    expect(isTokenActive(jwt, fixedNow)).toBe(false);
  });

  it("returns false for a token with wrong segment count", () => {
    expect(isTokenActive("only-one-segment", fixedNow)).toBe(false);
  });

  it("returns false for a token with two segments", () => {
    expect(isTokenActive("segment1.segment2", fixedNow)).toBe(false);
  });

  it("returns false for a JWT where exp is not a number", () => {
    const header = btoa(JSON.stringify({ alg: "RS256" }));
    const payload = btoa(JSON.stringify({ sub: "user-1", exp: "not-number" }));
    const jwt = `${header}.${payload}.sig`;
    expect(isTokenActive(jwt, fixedNow)).toBe(false);
  });

  it("returns false for a JWT with invalid base64 in payload", () => {
    const jwt = "valid-header.!!!invalid!!!.signature";
    expect(isTokenActive(jwt, fixedNow)).toBe(false);
  });

  it("prefers internal token format over JWT when decodable", () => {
    const tokens = createMockSessionTokens({ nowMs: fixedNow });
    expect(isTokenActive(tokens.accessToken, fixedNow)).toBe(true);
  });
});

describe("encodeAuthToken / decodeAuthToken roundtrip", () => {
  it("roundtrips a valid payload", () => {
    const payload = {
      type: "access" as const,
      sub: "user-1",
      role: "admin" as const,
      name: "Test User",
      iat: 1000,
      exp: 2000,
      jti: "unique-id",
    };

    const encoded = encodeAuthToken(payload);
    const decoded = decodeAuthToken(encoded);

    expect(decoded).toEqual(payload);
  });
});
