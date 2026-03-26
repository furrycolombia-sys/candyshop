import { parseAsInteger, parseAsString } from "nuqs";

export const auditSearchParams = {
  table: parseAsString.withDefault(""),
  action: parseAsString.withDefault(""),
  offset: parseAsInteger.withDefault(0),
};
