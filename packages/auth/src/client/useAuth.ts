"use client";

import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

type AuthProvider = "google" | "discord";

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithProvider: (
    provider: AuthProvider,
    redirectTo?: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

interface UseAuthOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: SupabaseClient<any, any, any>;
}

/**
 * Hook for authentication state and actions.
 *
 * Uses Supabase Auth for social login (Google, Discord).
 * Listens to auth state changes and provides sign-in/sign-out actions.
 *
 * @example
 * ```tsx
 * const supabase = createBrowserSupabaseClient();
 * const { user, isAuthenticated, signInWithProvider, signOut } = useAuth({ supabaseClient: supabase });
 * ```
 */
export function useAuth({ supabaseClient }: UseAuthOptions): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  const signInWithProvider = useCallback(
    async (provider: AuthProvider, redirectTo?: string) => {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo:
            redirectTo ?? `${globalThis.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    },
    [supabaseClient],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  }, [supabaseClient]);

  const user = session?.user ?? null;
  const isAuthenticated = !!session;

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    signInWithProvider,
    signOut,
  };
}
