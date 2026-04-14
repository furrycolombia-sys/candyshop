import { parseAsString } from "nuqs";

export const productsSearchParams = {
  type: parseAsString.withDefault(""),
  category: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
};
