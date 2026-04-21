import { parseAsFloat, parseAsString, parseAsStringEnum } from "nuqs";

import { ORDER_STATUS_LIST } from "./constants";
import type { OrderStatus } from "./types";

export const sellerReportsSearchParams = {
  dateFrom: parseAsString,
  dateTo: parseAsString,
  status: parseAsStringEnum<OrderStatus>([...ORDER_STATUS_LIST]),
  buyerId: parseAsString,
  currency: parseAsString,
  amountMin: parseAsFloat,
  amountMax: parseAsFloat,
};
