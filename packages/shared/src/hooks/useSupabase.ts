"use client";

import { createBrowserSupabaseClient } from "api/supabase";
import { useMemo } from "react";

/** Stable Supabase client instance for use in hooks (memoized per component lifecycle) */
export function useSupabase() {
  return useMemo(() => createBrowserSupabaseClient(), []);
}
