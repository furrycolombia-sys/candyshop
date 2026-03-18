export {
  environment,
  featureFlags,
  runtimeEnv,
  getRuntimeEnv,
  getMockApiBaseUrl,
  getApiPrefix,
  buildMswApiUrl,
} from "./environment";
export { tid, TID_ATTR } from "./tid";
export {
  API_REFRESH_INTERVALS,
  API_DEFAULTS,
  orvalOptions,
  type PartialQueryOptions,
} from "./api";

export const appUrls = {
  landing: process.env.NEXT_PUBLIC_LANDING_URL ?? "/",
  store: process.env.NEXT_PUBLIC_STORE_URL ?? "/store",
  payments: process.env.NEXT_PUBLIC_PAYMENTS_URL ?? "/payments",
  admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? "/admin",
  auth: process.env.NEXT_PUBLIC_AUTH_URL ?? "/auth",
  playground: process.env.NEXT_PUBLIC_PLAYGROUND_URL ?? "/playground",
} as const;
