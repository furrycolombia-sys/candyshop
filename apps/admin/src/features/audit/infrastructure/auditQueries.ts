import {
  AUDIT_ACTION_TYPES,
  AUDIT_PAGE_SIZE,
} from "@/features/audit/domain/constants";
import type { AuditEntry, AuditFilters } from "@/features/audit/domain/types";
import { auditRestQuery } from "@/shared/infrastructure/auditRestClient";

/* PostgREST query parameter keys & values */
const PARAM_ORDER = "order";
const PARAM_SELECT = "select";
const PARAM_TABLE_NAME = "table_name";
const PARAM_ACTION_TYPE = "action_type";
const ORDER_BY_TIMESTAMP_DESC = "action_timestamp.desc";
const POSTGREST_EQ_PREFIX = "eq.";

/** Fetch audit log entries with optional filters */
export async function fetchAuditLog(
  filters?: Partial<AuditFilters>,
  offset = 0,
): Promise<AuditEntry[]> {
  const params = new URLSearchParams();
  params.set(PARAM_ORDER, ORDER_BY_TIMESTAMP_DESC);
  params.set("offset", String(offset));
  params.set("limit", String(AUDIT_PAGE_SIZE));

  if (filters?.tableName) {
    const safeName = filters.tableName.replaceAll(/\W/g, "");
    if (safeName) {
      params.set(PARAM_TABLE_NAME, POSTGREST_EQ_PREFIX + safeName);
    }
  }

  if (filters?.actionType) {
    const safeActionType = (AUDIT_ACTION_TYPES as readonly string[]).includes(
      filters.actionType,
    )
      ? filters.actionType
      : null;
    if (safeActionType) {
      params.set(PARAM_ACTION_TYPE, POSTGREST_EQ_PREFIX + safeActionType);
    }
  }

  const data = await auditRestQuery("logged_actions_with_user", params);
  return data as AuditEntry[];
}

/** Fetch distinct table names for the filter dropdown */
export async function fetchAuditTableNames(): Promise<string[]> {
  const params = new URLSearchParams();
  params.set(PARAM_SELECT, PARAM_TABLE_NAME);
  params.set(PARAM_ORDER, PARAM_TABLE_NAME);

  const data = await auditRestQuery("logged_actions_with_user", params);
  const names = (data as Array<{ table_name: string }>).map(
    (r) => r.table_name,
  );
  return [...new Set(names)];
}
