"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { createBrowserSupabaseClient, getCurrentUserId } from "api/supabase";
import { useEffect, useMemo, useState } from "react";

export interface CurrentUser {
  /**
   * The signed-in person's local `user_profiles.id` — NOT the Clerk
   * subject. Every foreign key that used to reference `auth.users.id`
   * (orders, products, seller_admins, user_permissions, ...) now references
   * `user_profiles.id` instead (see
   * supabase/migrations/20260829120000_repoint_user_fks.sql), so this is
   * the id every call site that used to read `useSupabaseAuth().user.id`
   * needs.
   */
  id: string;
  email: string | null;
}

interface UseCurrentUserReturn {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

/**
 * Replaces `useSupabaseAuth()` now that Supabase Auth's session is gone.
 *
 * `useSupabaseAuth()` (and the `useAuth()` it wrapped) read
 * `supabaseClient.auth.getSession()`/`getUser()` — under Third-Party Auth
 * there is no such session to read, so both hooks always reported
 * signed-out. Clerk (`useUser()`) is now the source of sign-in state, but
 * its `user.id` is the Clerk subject, not a row in any of this app's
 * tables — every former consumer of `useSupabaseAuth().user.id` needs the
 * local profile id instead, resolved the same way the server-side call
 * sites do: the `current_user_id()` RPC (see `getCurrentUserId`).
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [isResolvingProfile, setIsResolvingProfile] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setProfileId(null);
      setIsResolvingProfile(false);
      return;
    }

    let isActive = true;
    setIsResolvingProfile(true);

    getCurrentUserId(supabase)
      .then((id) => {
        if (isActive) setProfileId(id);
      })
      .finally(() => {
        if (isActive) setIsResolvingProfile(false);
      });

    return () => {
      isActive = false;
    };
    // clerkUser?.id (not the whole clerkUser object) so this only re-runs
    // when the signed-in identity actually changes.
  }, [isLoaded, isSignedIn, clerkUser?.id, supabase]);

  const isLoading = !isLoaded || (isSignedIn && isResolvingProfile);
  const user: CurrentUser | null =
    isSignedIn && profileId
      ? {
          id: profileId,
          email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
        }
      : null;

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    signOut: () => clerkSignOut(),
  };
}
