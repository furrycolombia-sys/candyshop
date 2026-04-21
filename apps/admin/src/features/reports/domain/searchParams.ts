import { parseAsFloat, parseAsString, parseAsStringEnum } from "nuqs";

import { ORDER_STATUS_LIST } from "./constants";
import type { OrderStatus } from "./types";

export const reportsSearchParams = {
  dateFrom: parseAsString,
  dateTo: parseAsString,
  status: parseAsStringEnum<OrderStatus>([...ORDER_STATUS_LIST]),
  sellerId: parseAsString,
  buyerId: parseAsString,
  productId: parseAsString,
  currency: parseAsString,
  amountMin: parseAsFloat,
  amountMax: parseAsFloat,
};
