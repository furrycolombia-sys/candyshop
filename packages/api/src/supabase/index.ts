// Browser client (for Client Components, hooks, event handlers)
export { createBrowserSupabaseClient } from "./browser";

// Resolves the caller's local user_profiles.id from either client — see
// currentUserId.ts for why this replaces supabase.auth.getUser().
export { getCurrentUserId, getCurrentUserIdResult } from "./currentUserId";
export type { CurrentUserIdResult } from "./currentUserId";

// Server-only exports (createServerSupabaseClient, createServiceRoleSupabaseClient)
// must be imported directly from "api/supabase/server" to avoid pulling
// next/headers into the client bundle.

// Generated types
export type { Database } from "./types";
