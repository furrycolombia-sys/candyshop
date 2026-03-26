import { parseAsString } from "nuqs";

export const auditSearchParams = {
  table: parseAsString.withDefault(""),
  action: parseAsString.withDefault(""),
};
