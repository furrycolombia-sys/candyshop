/* eslint-disable i18next/no-literal-string -- rare, non-happy-path failure
   surface, not part of the app's translated UI. Same rationale as
   apps/auth/src/app/[locale]/callback/route.ts and
   apps/admin/src/app/api/admin/_shared/adminRest.ts's file-level disables:
   this package also carries no i18n at all (see
   .claude/rules/monorepo-architecture.md), so there is nowhere to source a
   translation from even if this were worth translating. */
"use client";

/**
 * Shown by `ProtectedRoute` when Clerk confirms a session exists but the
 * local profile lookup could not be completed (a transient failure, already
 * retried once). Deliberately not a blank fallback — the person is signed
 * in and needs a way forward, not silence.
 */
export function ProfileLookupErrorState() {
  return (
    <div role="alert" style={{ padding: "2rem", textAlign: "center" }}>
      <p>We could not verify your account. This is usually temporary.</p>
      <button type="button" onClick={() => globalThis.location.reload()}>
        Try again
      </button>
    </div>
  );
}
