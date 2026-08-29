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
 * Resolves the Clerk session token for the `accessToken` client option.
 *
 * supabase-js falls back to the anon key whenever this returns `null`
 * (`fetchWithAuth`: `const accessToken = (await getAccessToken()) ?? supabaseKey`
 * in `@supabase/supabase-js`'s `lib/fetch.ts`) — so a `null` here silently
 * downgrades every RLS-protected read to "public", which comes back empty
 * rather than erroring. An empty result reads to a customer as "you have no
 * orders", not "something broke".
 *
 * That fallback is *correct* for one case and wrong for another, and both
 * produce a `null` token:
 *
 * - Genuinely signed out (`Clerk.loaded === true`, `session` is null/absent):
 *   legitimate and expected — the storefront browses products anonymously,
 *   and this must keep returning `null` silently so that keeps working.
 * - Clerk hasn't hydrated yet (`globalThis.Clerk` is undefined, or present
 *   but `loaded` isn't `true`): a transient race on first paint, not a
 *   signed-out state. Silently falling back here means a real signed-in
 *   request that merely ran a moment too early gets treated as anonymous,
 *   with no trace of why.
 *
 * This still can't block the request — there is no good way to "wait" from
 * inside a `SupabaseClient` constructor option — but it makes the race
 * observable via `console.warn` instead of indistinguishable from a signed-
 * out user, which was the actual gap: nothing before this ever surfaced the
 * difference.
 */
async function getSupabaseAccessToken(): Promise<string | null> {
  const clerk = globalThis.Clerk;

  if (!clerk?.loaded) {
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
