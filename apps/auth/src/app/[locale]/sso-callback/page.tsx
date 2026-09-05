"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * The `redirectUrl` target for `signIn.authenticateWithRedirect()` (see
 * `SocialLoginButtons`). Clerk's OAuth completion runs client-side — the
 * SDK instance that started the flow has to be the one that finishes it —
 * so this must be a page, not a Route Handler. It mounts
 * `<AuthenticateWithRedirectCallback />`, which completes the sign-in and
 * then navigates to the `redirectUrlComplete` that was passed to
 * `authenticateWithRedirect()` (`/{locale}/callback?next=...`), where the
 * Clerk identity is resolved to a `user_profiles` row before the person
 * reaches their final destination.
 */
export default function SsoCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}
