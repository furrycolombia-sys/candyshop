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
  session?: {
    getToken: () => Promise<string | null>;
  } | null;
}

declare global {
  var Clerk: ClerkGlobal | undefined;
}

let browserClient: SupabaseClient<Database> | null = null;

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
    accessToken: async () =>
      (await globalThis.Clerk?.session?.getToken()) ?? null,
  });

  return browserClient;
}
