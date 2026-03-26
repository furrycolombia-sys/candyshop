import type { AuditEntry, AuditFilters } from "@/features/audit/domain/types";

const PAGE_SIZE = 50;

/* PostgREST query parameter keys & values */
const PARAM_ORDER = "order";
const PARAM_SELECT = "select";
const PARAM_TABLE_NAME = "table_name";
const PARAM_ACTION_TYPE = "action_type";
const ORDER_BY_TIMESTAMP_DESC = "action_timestamp.desc";
const HEADER_AUTHORIZATION = "Authorization";
const HEADER_BEARER_PREFIX = "Bearer ";
const POSTGREST_EQ_PREFIX = "eq.";

/** Get the Supabase REST URL and key from environment */
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return { url, key };
}

/** Direct REST query to the audit schema (not in generated types) */
async function auditQuery(
  table: string,
  params: URLSearchParams,
): Promise<unknown[]> {
  const { url, key } = getSupabaseConfig();
  const queryString = params.toString();
  const endpoint = `${url}/rest/v1/${table}?${queryString}`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      [HEADER_AUTHORIZATION]: `${HEADER_BEARER_PREFIX}${key}`,
      // Tell PostgREST to use the audit schema
      "Accept-Profile": "audit",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Audit query failed: ${String(response.status)}`);
  }

  return response.json() as Promise<unknown[]>;
}

/** Fetch audit log entries with optional filters */
export async function fetchAuditLog(
  filters?: Partial<AuditFilters>,
  offset = 0,
): Promise<AuditEntry[]> {
  const params = new URLSearchParams();
  params.set(PARAM_ORDER, ORDER_BY_TIMESTAMP_DESC);
  params.set("offset", String(offset));
  params.set("limit", String(PAGE_SIZE));

  if (filters?.tableName) {
    params.set(PARAM_TABLE_NAME, POSTGREST_EQ_PREFIX + filters.tableName);
  }

  if (filters?.actionType) {
    params.set(PARAM_ACTION_TYPE, POSTGREST_EQ_PREFIX + filters.actionType);
  }

  const data = await auditQuery("logged_actions_with_user", params);
  return data as AuditEntry[];
}

/** Fetch distinct table names for the filter dropdown */
export async function fetchAuditTableNames(): Promise<string[]> {
  const params = new URLSearchParams();
  params.set(PARAM_SELECT, PARAM_TABLE_NAME);
  params.set(PARAM_ORDER, PARAM_TABLE_NAME);

  const data = await auditQuery("logged_actions_with_user", params);
  const names = (data as Array<{ table_name: string }>).map(
    (r) => r.table_name,
  );
  return [...new Set(names)];
}
