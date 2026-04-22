import { parseAsStringEnum } from "nuqs";

import {
  ASSIGNED_FILTER_STATUSES,
  type AssignedFilterStatus,
} from "@/features/assigned-orders/domain/constants";

export const assignedOrdersSearchParams = {
  filter: parseAsStringEnum<AssignedFilterStatus>([
    ...ASSIGNED_FILTER_STATUSES,
  ]).withDefault("actionable"),
};
