import { updateSupabaseSession } from "api/supabase";
import { type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/shared/infrastructure/i18n";

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const supabaseResponse = await updateSupabaseSession(request);
  const intlResponse = intlMiddleware(request);

  for (const cookie of supabaseResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie.name, cookie.value);
  }

  return intlResponse;
}

export const config = {
  matcher: [String.raw`/((?!api|_next|_vercel|.*\..*).*)`],
};
