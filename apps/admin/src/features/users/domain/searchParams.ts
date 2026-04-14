import { parseAsInteger, parseAsString } from "nuqs";

export const usersSearchParams = {
  search: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};
