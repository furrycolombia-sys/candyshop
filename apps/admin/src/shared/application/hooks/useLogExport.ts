import { useMutation } from "@tanstack/react-query";
import { useSupabase } from "shared";

import { insertAuditLog } from "@/shared/infrastructure/auditLog";

/**
 * Records an export in the audit log.
 *
 * Shared, not part of the audit feature: exporting is something a feature
 * does, and the audit feature is the thing that displays what was done. Its
 * only caller is the users page, which used to import it across a feature
 * boundary.
 */
export function useLogExport() {
  const supabase = useSupabase();
  return useMutation({
    mutationFn: async (params: { table: string; count: number }) => {
      await insertAuditLog(supabase, "EXPORT", params.table, {
        exported_count: params.count,
      });
    },
  });
}
