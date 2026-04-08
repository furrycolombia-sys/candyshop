import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

type IntlRouting = {
  defaultLocale: string;
  locales: readonly string[];
  localeCookie?: unknown;
  localeDetection?: boolean;
  localePrefix?: unknown;
  domains?: unknown;
  alternateLinks?: boolean;
};
type ProxyResponse = Awaited<ReturnType<typeof NextResponse.next>>;

interface ProxyBypassOptions {
  extraBypassPrefixes?: string[];
}

interface SupabaseIntlProxyOptions extends ProxyBypassOptions {
  routing: IntlRouting;
  updateSession: (request: NextRequest) => Promise<ProxyResponse>;
}

function shouldBypass(
  pathname: string,
  extraBypassPrefixes: readonly string[] = [],
) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    extraBypassPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.includes(".")
  );
}

export function createIntlProxy(
  routing: IntlRouting,
  options: ProxyBypassOptions = {},
) {
  const intlMiddleware = createMiddleware(
    routing as Parameters<typeof createMiddleware>[0],
  );

  return function proxy(request: NextRequest) {
    if (shouldBypass(request.nextUrl.pathname, options.extraBypassPrefixes)) {
      return NextResponse.next();
    }

    return intlMiddleware(request);
  };
}

export function createSupabaseIntlProxy({
  routing,
  updateSession,
  extraBypassPrefixes,
}: SupabaseIntlProxyOptions) {
  const intlMiddleware = createMiddleware(
    routing as Parameters<typeof createMiddleware>[0],
  );

  return async function proxy(request: NextRequest) {
    if (shouldBypass(request.nextUrl.pathname, extraBypassPrefixes)) {
      return NextResponse.next();
    }

    const supabaseResponse = await updateSession(request);
    const intlResponse = intlMiddleware(request);

    for (const cookie of supabaseResponse.cookies.getAll()) {
      intlResponse.cookies.set(cookie.name, cookie.value);
    }

    return intlResponse;
  };
}
