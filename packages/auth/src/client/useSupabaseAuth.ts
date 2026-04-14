"use client";

import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

import { useAuth } from "./useAuth";

/**
 * Convenience hook that creates a browser Supabase client and provides auth state.
 * Use this in apps instead of calling useAuth directly.
 */
export function useSupabaseAuth() {
  const supabaseClient = useMemo(() => createBrowserSupabaseClient(), []);
  return useAuth({ supabaseClient });
}
