import { updateSupabaseSession } from "api/supabase/proxy";
import { createSupabaseIntlProxy } from "shared/i18n/createIntlProxy";

import { routing } from "@/shared/infrastructure/i18n";

export default createSupabaseIntlProxy({
  routing,
  updateSession: updateSupabaseSession,
  extraBypassPrefixes: ["/auth/callback", "/callback"],
});
