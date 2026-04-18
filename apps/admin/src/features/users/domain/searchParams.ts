import { parseAsInteger, parseAsString } from "nuqs";

export const usersSearchParams = {
  search: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  roleFilter: parseAsString.withDefault("all"),
  itemFilter: parseAsString.withDefault("all"),
};
