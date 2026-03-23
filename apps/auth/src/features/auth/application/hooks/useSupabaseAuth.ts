"use client";

import { createBrowserSupabaseClient } from "api/supabase";
import { useAuth } from "auth/client";
import { useMemo } from "react";

/**
 * App-level auth hook that creates the Supabase client and delegates to useAuth.
 *
 * Use this in the auth app instead of calling useAuth directly —
 * it handles client creation so components don't need to.
 */
export function useSupabaseAuth() {
  const supabaseClient = useMemo(() => createBrowserSupabaseClient(), []);
  return useAuth({ supabaseClient });
}
