export type AuthRole = "admin" | "analyst" | "viewer";

export type AuthTokenType = "access" | "refresh";

export interface AuthTokenPayload {
  type: AuthTokenType;
  sub: string;
  role: AuthRole;
  name?: string;
  iat: number;
  exp: number;
  jti: string;
}

export interface CreateMockSessionInput {
  subject?: string;
  role?: AuthRole;
  name?: string;
  nowMs?: number;
}

export interface MockSessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenPayload: AuthTokenPayload;
  refreshTokenPayload: AuthTokenPayload;
}

export interface AuthCookieTokens {
  accessToken?: string;
  refreshToken?: string;
}

export interface SessionState {
  hasValidAccessToken: boolean;
  hasValidRefreshToken: boolean;
  requiresRefresh: boolean;
  isAuthenticated: boolean;
}
