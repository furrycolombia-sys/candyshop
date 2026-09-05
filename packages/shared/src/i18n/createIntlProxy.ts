import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { shouldBypass } from "./shouldBypass";

type IntlRouting = {
  defaultLocale: string;
  locales: readonly string[];
  localeCookie?: unknown;
  localeDetection?: boolean;
  localePrefix?: unknown;
  domains?: unknown;
  alternateLinks?: boolean;
};

/**
 * The locale-routing middleware every app wraps.
 *
 * Each app's `proxy.ts` composes this inside `clerkMiddleware()`, which is
 * what populates the request context that `auth()` and `currentUser()` need.
 *
 * @param routing - the app's next-intl routing configuration.
 * @returns a middleware function for `proxy.ts` to export.
 */
export function createIntlProxy(routing: IntlRouting) {
  const intlMiddleware = createMiddleware(
    routing as Parameters<typeof createMiddleware>[0],
  );

  return function proxy(request: NextRequest) {
    if (shouldBypass(request.nextUrl.pathname)) {
      return NextResponse.next();
    }

    return intlMiddleware(request);
  };
}
