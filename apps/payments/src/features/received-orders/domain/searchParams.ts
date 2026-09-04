import { parseAsStringEnum } from "nuqs";

import {
  ASSIGNED_FILTER_STATUSES,
  FILTER_STATUSES,
  type AssignedFilterStatus,
  type FilterStatus,
} from "./constants";

export const receivedOrdersSearchParams = {
  filter: parseAsStringEnum<FilterStatus>([...FILTER_STATUSES]).withDefault(
    "all",
  ),
};

export const assignedOrdersSearchParams = {
  filter: parseAsStringEnum<AssignedFilterStatus>([
    ...ASSIGNED_FILTER_STATUSES,
  ]).withDefault("actionable"),
};
