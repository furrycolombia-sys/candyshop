// Browser client (for Client Components, hooks, event handlers)
export { createBrowserSupabaseClient } from "./browser";

// Server client (for Server Components, Route Handlers, Server Actions)
export { createServerSupabaseClient } from "./server";

// Proxy/middleware session refresh
export { updateSupabaseSession } from "./proxy";

// Legacy singleton (prefer createBrowserSupabaseClient for new code)
export { supabase } from "./client";

// Generated types
export type { Database } from "./types";
