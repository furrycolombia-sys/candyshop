import { z } from "zod";

/** Cookie key used by the client and server permission caches */
export const PERM_COOKIE_KEY = "libra-perm";

/** Maximum serialised byte length before we skip writing the perm cookie (browser limit is 4 KB) */
export const PERM_COOKIE_MAX_BYTES = 3500;

/** Validates the cookie payload: an array of "resource.action" strings */
export const permCacheSchema = z.array(
  z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/),
);
