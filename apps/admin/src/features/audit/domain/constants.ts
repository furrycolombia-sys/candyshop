/** Number of audit log entries per page / fetch batch */
export const AUDIT_PAGE_SIZE = 50;

/** Valid action types tracked by the audit system */
export const AUDIT_ACTION_TYPES = ["INSERT", "UPDATE", "DELETE"] as const;

/** React Query key for audit log queries */
export const AUDIT_QUERY_KEY = "audit-log";

/** React Query key for audit table names queries */
export const TABLE_NAMES_KEY = "audit-table-names";
