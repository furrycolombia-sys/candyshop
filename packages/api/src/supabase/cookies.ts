import type { NextRequest } from "next/server";

const DOMAIN_PARTS_MINIMUM = 2;
const DOMAIN_SLICE_START = -2;

type CookieOptions = {
  domain?: string;
  secure?: boolean;
  [key: string]: unknown;
};

function getPublicHost(): string | null {
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
  if (!authUrl) return null;

  try {
    return new URL(authUrl).hostname;
  } catch {
    return null;
  }
}

function getSharedCookieDomain(hostname: string): string | undefined {
  if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;

  const hostParts = hostname.split(".");
  if (hostParts.length < DOMAIN_PARTS_MINIMUM) return undefined;

  return `.${hostParts.slice(DOMAIN_SLICE_START).join(".")}`;
}

export function getSupabaseCookieOverrides(
  request?: NextRequest,
): CookieOptions {
  const publicHost = getPublicHost();
  const requestHost =
    request?.headers.get("x-forwarded-host") ?? request?.headers.get("host");
  const hostname =
    requestHost?.split(":")[0] ??
    publicHost ??
    new URL(process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost").hostname;
  const sharedDomain = getSharedCookieDomain(hostname);
  const protocol =
    request?.headers.get("x-forwarded-proto") ??
    (hostname === "localhost" || hostname === "127.0.0.1" ? "http" : "https");

  return {
    ...(sharedDomain ? { domain: sharedDomain } : {}),
    secure: protocol === "https",
  };
}

export function mergeSupabaseCookieOptions(
  options: CookieOptions | undefined,
  request?: NextRequest,
): CookieOptions {
  return {
    ...options,
    ...getSupabaseCookieOverrides(request),
  };
}
