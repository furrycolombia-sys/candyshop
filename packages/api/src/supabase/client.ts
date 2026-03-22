import { createClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import type { Database } from "./types";

/**
 * Supabase client singleton for browser/client-side usage.
 *
 * Uses the anon (publishable) key — safe for client-side.
 * RLS policies control what data each user can access.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
