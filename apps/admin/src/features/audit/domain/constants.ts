/** Number of audit log entries per page / fetch batch */
export const AUDIT_PAGE_SIZE = 50;

/** Valid action types tracked by the audit system */
export const AUDIT_ACTION_TYPES = ["INSERT", "UPDATE", "DELETE"] as const;
