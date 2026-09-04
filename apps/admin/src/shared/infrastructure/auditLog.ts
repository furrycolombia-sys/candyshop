import { getCurrentUserId } from "api/supabase";
import { getSupabaseAccessToken } from "api/supabase/browser";

import type { SupabaseClient } from "@/shared/domain/types";
import { getSupabaseConfig } from "@/shared/infrastructure/auditRestClient";

/**
 * Writing an audit entry, moved out of the audit feature.
 *
 * Reading entries is what the audit feature is for; writing one is something
 * any feature does. This lived in `features/audit/infrastructure` and its only
 * caller is in `features/users`, so the audit feature exported a service it
 * never used and another feature reached across a boundary to reach it --
 * which scripts/check-feature-boundaries.mjs reports against the architecture
 * rule.
 *
 * Copied verbatim rather than retyped: the Content-Profile header and the
 * schema_name field are not obvious from the call site, and rewriting from
 * memory is how a working function quietly stops working.
 */
const AUDIT_SCHEMA = "audit";
const JSON_CONTENT_TYPE = "application/json";

/**
 * Log a custom manual action to the audit schema directly via POST.
 *
 * Still takes a Supabase client — unlike `auditRestQuery`, this needs the
 * caller's local `user_profiles.id` for the `user_id` column, which requires
 * the `current_user_id()` RPC (see `getCurrentUserId`), not just a bearer
 * token. `session?.user?.id` used to be that id directly off the Supabase
 * Auth session; there is no such session under Third-Party Auth.
 */
export async function insertAuditLog(
  supabase: SupabaseClient,
  actionType: string,
  tableName: string,
  rowData: unknown = null,
): Promise<void> {
  const { url, key } = getSupabaseConfig();
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Unauthenticated");

  const userId = await getCurrentUserId(supabase);

  const endpoint = `${url}/rest/v1/logged_actions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`, // eslint-disable-line i18next/no-literal-string -- HTTP header
      "Content-Profile": AUDIT_SCHEMA,
      "Content-Type": JSON_CONTENT_TYPE,
      Prefer: "return=minimal", // eslint-disable-line i18next/no-literal-string -- HTTP header
    },
    body: JSON.stringify({
      action_type: actionType,
      schema_name: "public",
      table_name: tableName,
      row_data: rowData,
      user_id: userId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Audit insert failed: ${String(response.status)}`);
  }
}
