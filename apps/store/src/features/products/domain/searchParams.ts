import { parseAsString } from "nuqs";

export const catalogSearchParams = {
  category: parseAsString.withDefault(""),
  type: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
};
