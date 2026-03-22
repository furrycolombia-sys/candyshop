// Browser client (for Client Components, hooks, event handlers)
export { createBrowserSupabaseClient } from "./browser";

// Legacy singleton (prefer createBrowserSupabaseClient for new code)
export { supabase } from "./client";

// Server-only exports (createServerSupabaseClient, updateSupabaseSession)
// must be imported directly from "api/supabase/server" or "api/supabase/proxy"
// to avoid pulling next/headers into the client bundle.

// Generated types
export type { Database } from "./types";
