export {
  environment,
  featureFlags,
  runtimeEnv,
  getRuntimeEnv,
} from "./environment";

export const appUrls = {
  landing: process.env.NEXT_PUBLIC_LANDING_URL ?? "/",
  store: process.env.NEXT_PUBLIC_STORE_URL ?? "/store",
  payments: process.env.NEXT_PUBLIC_PAYMENTS_URL ?? "/payments",
  admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? "/admin",
  auth: process.env.NEXT_PUBLIC_AUTH_URL ?? "/auth",
  playground: process.env.NEXT_PUBLIC_PLAYGROUND_URL ?? "/playground",
} as const;
