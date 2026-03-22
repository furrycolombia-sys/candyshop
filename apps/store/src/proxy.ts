import { updateSupabaseSession } from "api/supabase/proxy";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/shared/infrastructure/i18n";

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and internal Next.js requests
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Refresh Supabase session (keeps auth cookies alive)
  const supabaseResponse = await updateSupabaseSession(request);

  // Run i18n middleware (handles locale detection and redirects)
  const intlResponse = intlMiddleware(request);

  // Merge Supabase cookies into the i18n response
  for (const cookie of supabaseResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie.name, cookie.value);
  }

  return intlResponse;
}
