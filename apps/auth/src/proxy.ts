import { clerkMiddleware } from "@clerk/nextjs/server";
import { createIntlProxy } from "shared/i18n/createIntlProxy";

import { routing } from "@/shared/infrastructure/i18n";

/**
 * The auth app no longer has a Supabase Auth session to refresh —
 * `updateSupabaseSession()` called `supabase.auth.getClaims()` against a
 * cookie-based session that Third-Party Auth (Clerk) replaced; Supabase now
 * trusts the Clerk token directly (see `packages/api/src/supabase/server.ts`
 * and `browser.ts`), so that refresher had become a no-op that only ran
 * useless work on every request. `clerkMiddleware()` replaces it: it
 * populates the request context so `auth()`/`currentUser()` (used by
 * `createServerSupabaseClient`, `getServerUserEmail`, and the callback
 * route's profile resolution) work instead of throwing. See
 * task-9-report.md, "The bigger sequencing gap: clerkMiddleware() is nowhere
 * yet" for why this was previously missing.
 *
 * Only this app's proxy is changed here — the other apps still call
 * `updateSupabaseSession()` and are Task 11's problem per this task's brief.
 */
const intlProxy = createIntlProxy(routing, {
  extraBypassPrefixes: ["/auth/callback", "/callback"],
});

export default clerkMiddleware((_auth, request) => intlProxy(request));
