import { stripTrailingSlash } from "../utils/url";

function normalizeBase(base: string): string {
  return stripTrailingSlash(base);
}

function buildBaseUrl(authHostUrl: string, requestOrigin: string): string {
  try {
    return new URL(authHostUrl).toString();
  } catch {
    return new URL(authHostUrl, requestOrigin).toString();
  }
}

export function buildLoginRedirectUrl(input: {
  authHostUrl: string;
  requestOrigin: string;
  locale: string;
  returnTo: string;
}): string {
  const base = normalizeBase(
    buildBaseUrl(input.authHostUrl, input.requestOrigin),
  );
  const loginUrl = new URL(`${base}/${input.locale}/login`);
  loginUrl.searchParams.set("returnTo", input.returnTo);
  return loginUrl.toString();
}

export function resolveSafeRedirectTarget(input: {
  value: string | null;
  fallback: string;
  requestOrigin: string;
  allowedOrigins: string[];
}): string {
  if (!input.value) {
    return input.fallback;
  }

  try {
    const target = new URL(input.value, input.requestOrigin);

    if (!allowedOriginSet(input.allowedOrigins).has(target.origin)) {
      return input.fallback;
    }

    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return input.fallback;
    }

    return target.toString();
  } catch {
    return input.fallback;
  }
}

function allowedOriginSet(values: string[]): Set<string> {
  const origins = new Set<string>();

  for (const value of values) {
    try {
      origins.add(new URL(value).origin);
    } catch {
      // Ignore invalid candidate origins.
    }
  }

  return origins;
}
