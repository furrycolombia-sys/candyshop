import {
  type AuthCookieTokens,
  type AuthRole,
  type AuthTokenPayload,
  type AuthTokenType,
  type CreateMockSessionInput,
  type MockSessionTokens,
  type SessionState,
} from "./types";

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const ACCESS_TOKEN_MINUTES = 60;
const BASE64_BLOCK_SIZE = 4;
const MILLISECONDS_PER_SECOND = 1000;

export const AUTH_COOKIE_NAMES = {
  accessToken: "auth_access_token",
  refreshToken: "auth_refresh_token",
} as const;

export const TOKEN_TTL_SECONDS = {
  access: ACCESS_TOKEN_MINUTES * SECONDS_PER_MINUTE,
  refresh:
    DAYS_PER_WEEK * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE,
} as const;

function stripBase64Padding(value: string): string {
  return value.replaceAll("=", "");
}

function toBase64Url(value: string): string {
  const base64 = btoa(value);
  return stripBase64Padding(base64).replaceAll("+", "-").replaceAll("/", "_");
}

function fromBase64Url(value: string): string {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const remainder = base64.length % BASE64_BLOCK_SIZE;
  const paddingSize = remainder === 0 ? 0 : BASE64_BLOCK_SIZE - remainder;
  const padded = `${base64}${"=".repeat(paddingSize)}`;
  return atob(padded);
}

function nowInSeconds(nowMs = Date.now()): number {
  return Math.floor(nowMs / MILLISECONDS_PER_SECOND);
}

function randomTokenId(): string {
  return crypto.randomUUID();
}

function isAuthRole(value: unknown): value is AuthRole {
  return value === "admin" || value === "analyst" || value === "viewer";
}

function createPayload(input: {
  type: AuthTokenType;
  sub: string;
  role: AuthRole;
  name?: string;
  iat: number;
  ttlSeconds: number;
}): AuthTokenPayload {
  return {
    type: input.type,
    sub: input.sub,
    role: input.role,
    name: input.name,
    iat: input.iat,
    exp: input.iat + input.ttlSeconds,
    jti: randomTokenId(),
  };
}

function isValidPayloadShape(data: Record<string, unknown>): boolean {
  const type = data.type;
  const sub = data.sub;
  const role = data.role;
  const iat = data.iat;
  const exp = data.exp;
  const jti = data.jti;
  const name = data.name;

  const hasValidType = type === "access" || type === "refresh";
  const hasValidSub = typeof sub === "string";
  const hasValidRole = isAuthRole(role);
  const hasValidIat = typeof iat === "number";
  const hasValidExp = typeof exp === "number";
  const hasValidJti = typeof jti === "string";
  const hasValidName = name === undefined || typeof name === "string";

  const checks = [
    hasValidType,
    hasValidSub,
    hasValidRole,
    hasValidIat,
    hasValidExp,
    hasValidJti,
    hasValidName,
  ];

  return checks.every(Boolean);
}

export function encodeAuthToken(payload: AuthTokenPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeAuthToken(token: string): AuthTokenPayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(token)) as unknown;

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const data = parsed as Record<string, unknown>;

    if (!isValidPayloadShape(data)) {
      return null;
    }

    return {
      type: data.type,
      sub: data.sub,
      role: data.role,
      name: data.name,
      iat: data.iat,
      exp: data.exp,
      jti: data.jti,
    } as AuthTokenPayload;
  } catch {
    return null;
  }
}

const JWT_SEGMENT_COUNT = 3;

/**
 * Returns true if the token is a standard JWT (e.g. from Keycloak) with exp in the future.
 */
function isStandardJwtActive(token: string, nowMs = Date.now()): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== JWT_SEGMENT_COUNT) return false;
    const payloadPart = parts[1];
    if (payloadPart === undefined) return false;
    const payloadJson = fromBase64Url(payloadPart);
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    const exp = payload.exp;
    if (typeof exp !== "number") return false;
    return exp > nowInSeconds(nowMs);
  } catch {
    return false;
  }
}

export function isTokenActive(token: string, nowMs = Date.now()): boolean {
  const payload = decodeAuthToken(token);

  if (payload) {
    return payload.exp > nowInSeconds(nowMs);
  }

  return isStandardJwtActive(token, nowMs);
}

export function createMockSessionTokens(
  input: CreateMockSessionInput = {},
): MockSessionTokens {
  const iat = nowInSeconds(input.nowMs);
  const subject = input.subject ?? "auth-user";
  const role = input.role ?? "admin";
  const name = input.name ?? "Mock User";

  const accessTokenPayload = createPayload({
    type: "access",
    sub: subject,
    role,
    name,
    iat,
    ttlSeconds: TOKEN_TTL_SECONDS.access,
  });

  const refreshTokenPayload = createPayload({
    type: "refresh",
    sub: subject,
    role,
    name,
    iat,
    ttlSeconds: TOKEN_TTL_SECONDS.refresh,
  });

  return {
    accessTokenPayload,
    refreshTokenPayload,
    accessToken: encodeAuthToken(accessTokenPayload),
    refreshToken: encodeAuthToken(refreshTokenPayload),
  };
}

export function getSessionState(
  cookies: AuthCookieTokens,
  nowMs = Date.now(),
): SessionState {
  const hasValidAccessToken =
    typeof cookies.accessToken === "string"
      ? isTokenActive(cookies.accessToken, nowMs)
      : false;

  const hasValidRefreshToken =
    typeof cookies.refreshToken === "string"
      ? isTokenActive(cookies.refreshToken, nowMs)
      : false;

  return {
    hasValidAccessToken,
    hasValidRefreshToken,
    requiresRefresh: !hasValidAccessToken && hasValidRefreshToken,
    isAuthenticated: hasValidAccessToken || hasValidRefreshToken,
  };
}
