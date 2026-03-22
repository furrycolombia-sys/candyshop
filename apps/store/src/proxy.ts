import { updateSupabaseSession } from "api/supabase/proxy";
import { type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/shared/infrastructure/i18n";

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
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

export const config = {
  matcher: [String.raw`/((?!api|_next|_vercel|.*\..*).*)`],
};
