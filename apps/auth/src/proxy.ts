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
 * yet" for why this was previously missing, and task-11-report.md for the
 * rest of the apps, which carried the same gap.
 *
 * No `extraBypassPrefixes` needed: the old `/auth/callback` and `/callback`
 * routes were the pre-Clerk OAuth code-exchange handlers
 * (`api/supabase/callback`'s `handleOAuthCallback`), deleted in Task 11.
 * Clerk's callback lives at `/{locale}/callback` and `/{locale}/sso-callback`
 * instead — already locale-prefixed, so the intl middleware handles them
 * like any other route.
 */
const intlProxy = createIntlProxy(routing);

export default clerkMiddleware((_auth, request) => intlProxy(request));
