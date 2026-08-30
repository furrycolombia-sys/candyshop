import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import type { Database } from "./types";

/**
 * The subset of the Clerk browser SDK's `Clerk` object this file reads.
 * `<ClerkProvider>` (a `@clerk/nextjs` client component each app wires up in
 * its root layout) loads the Clerk JS SDK and assigns it to `globalThis.Clerk`
 * once ready — see
 * https://clerk.com/docs/guides/development/access-clerk-outside-components.
 *
 * Deliberately typed by hand instead of importing `@clerk/types`: this file
 * must stay free of any `@clerk/*` import so the Clerk SDK, already loaded
 * once by `<ClerkProvider>`, is never pulled into this bundle a second time.
 */
interface ClerkGlobal {
  /**
   * True once the Clerk JS SDK has finished initializing. Absent or `false`
   * means "don't trust `session` yet" — see `getSupabaseAccessToken` below.
   */
  loaded?: boolean;
  session?: {
    getToken: () => Promise<string | null>;
  } | null;
}

declare global {
  var Clerk: ClerkGlobal | undefined;
}

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Resolves the current Clerk session token.
 *
 * Used as the `accessToken` client option below, and — exported — as a
 * standalone getter for the handful of call sites that bypass supabase-js
 * entirely with a manual `fetch()` (e.g.
 * `apps/admin/src/shared/infrastructure/auditRestClient.ts` and
 * `apps/admin/src/features/audit/infrastructure/auditQueries.ts`'s
 * `insertAuditLog`, which need the raw bearer token for a request against a
 * schema/view supabase-js's query builder cannot reach). Both uses have the
 * same failure mode: a `null` here either falls back to the anon key
 * (supabase-js: `fetchWithAuth`: `const accessToken = (await
 * getAccessToken()) ?? supabaseKey` in `@supabase/supabase-js`'s
 * `lib/fetch.ts`) or must be treated as "unauthenticated" by the caller —
 * either way, silently downgrading every RLS-protected read to "public",
 * which comes back empty rather than erroring. An empty result reads to a
 * customer as "you have no orders", not "something broke".
 *
 * A `null` token can mean three different things, and only one of them is
 * worth a `console.warn`:
 *
 * 1. `globalThis.Clerk` is `undefined` — `<ClerkProvider>` hasn't rendered
 *    yet. Every app now wires up `<ClerkProvider>` (confirmed by grepping
 *    for it across every app's src directory — see task-11-report.md), so
 *    this is a startup race, not a permanent state.
 * 2. `globalThis.Clerk` exists but `loaded` isn't `true` yet — the app DOES
 *    have `<ClerkProvider>`, the Clerk JS SDK's script has started
 *    executing and assigned itself to the global, but its own async
 *    initialization (environment fetch, session restore) hasn't finished.
 *    This is the real transient race on first paint: a signed-in request
 *    that merely ran a moment too early would otherwise be silently treated
 *    as anonymous, with no trace of why. Warn.
 * 3. `globalThis.Clerk.loaded === true` and `session` is null/absent —
 *    genuinely signed out, the legitimate state the storefront's anonymous
 *    browsing depends on. Silent.
 *
 * This still can't block the request — there is no good way to "wait" from
 * inside a `SupabaseClient` constructor option — but case 2 is now
 * observable via `console.warn` instead of indistinguishable from case 1 or
 * 3, which was the actual gap this closes.
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  const clerk = globalThis.Clerk;

  if (clerk === undefined) {
    // No Clerk wired into this app at all — see case 1 above. Not a race.
    return null;
  }

  if (!clerk.loaded) {
    console.warn(
      "[supabase/browser] Clerk has not finished loading yet — this " +
        "request will use the anon key instead of a session token. If this " +
        "keeps happening after the initial page load, something is calling " +
        "Supabase before <ClerkProvider> has hydrated.",
    );
    return null;
  }

  return (await clerk.session?.getToken()) ?? null;
}

/**
 * Creates a Supabase client for use in Client Components (browser).
 *
 * Under Third-Party Auth, the Clerk session token *is* the Supabase access
 * token — there is no Supabase session left to share, so the old "reuse a
 * singleton so hooks share auth state" reasoning no longer applies as such.
 * The singleton is kept anyway so every existing call site keeps working
 * unchanged (several memoize this with `useMemo(() => ..., [])`, and one
 * calls it from a React Query `queryFn`, outside any component render): the
 * token itself is re-read from `globalThis.Clerk` inside the `accessToken`
 * callback on every Supabase request, so one long-lived client instance
 * still always sends the caller's current token.
 *
 * `globalThis.Clerk` is read lazily inside `accessToken` — never at the top of
 * this function — specifically so this stays a plain function rather than a
 * React Hook. Calling `@clerk/nextjs`'s `useAuth()` here directly would
 * violate the Rules of Hooks for the existing call sites described above
 * (a hook can't be invoked from inside a `useMemo` factory or from outside
 * render at all). See task-9-report.md for the full analysis.
 */
export function createBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    accessToken: getSupabaseAccessToken,
  });

  return browserClient;
}
