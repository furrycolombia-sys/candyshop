import { clerkMiddleware } from "@clerk/nextjs/server";
import { createIntlProxy } from "shared/i18n/createIntlProxy";

import { routing } from "@/shared/infrastructure/i18n";

/**
 * This app no longer has a Supabase Auth session to refresh —
 * `updateSupabaseSession()` called `supabase.auth.getClaims()` against a
 * cookie-based session that Third-Party Auth (Clerk) replaced; Supabase now
 * trusts the Clerk token directly (see `packages/api/src/supabase/server.ts`
 * and `browser.ts`), so that refresher had become a no-op that only ran
 * useless work on every request. `clerkMiddleware()` replaces it: it
 * populates the request context so `auth()`/`currentUser()` (used by
 * `createServerSupabaseClient` and `getServerUserEmail`) work instead of
 * throwing — without it, every authenticated Supabase read silently fell
 * back to the anon key and came back empty. See
 * apps/auth/src/proxy.ts for the app this pattern was first applied to, and
 * task-11-report.md for why the remaining apps needed it too.
 */
const intlProxy = createIntlProxy(routing);

export default clerkMiddleware((_auth, request) => intlProxy(request));
