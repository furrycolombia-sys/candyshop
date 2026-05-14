import { cookies } from "next/headers";

import { permCacheSchema, PERM_COOKIE_KEY } from "../constants";

export async function readPermCacheServer(): Promise<string[]> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(PERM_COOKIE_KEY)?.value;
    if (!raw) return [];
    const result = permCacheSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}
