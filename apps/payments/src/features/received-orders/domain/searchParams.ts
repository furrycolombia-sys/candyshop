import { parseAsStringEnum } from "nuqs";

import { FILTER_STATUSES, type FilterStatus } from "./constants";

export const receivedOrdersSearchParams = {
  filter: parseAsStringEnum<FilterStatus>([...FILTER_STATUSES]).withDefault(
    "all",
  ),
};
