import type { createBrowserSupabaseClient } from "api/supabase";

/** Canonical Supabase browser client type. Single source of truth for all apps. */
export type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;
