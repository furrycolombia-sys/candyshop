export const appUrls = {
  landing: process.env.NEXT_PUBLIC_LANDING_URL ?? "/",
  store: process.env.NEXT_PUBLIC_STORE_URL ?? "/store",
  studio: process.env.NEXT_PUBLIC_STUDIO_URL ?? "/studio",
  payments: process.env.NEXT_PUBLIC_PAYMENTS_URL ?? "/payments",
  admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? "/admin",
  auth: process.env.NEXT_PUBLIC_AUTH_URL ?? "/auth",
  playground: process.env.NEXT_PUBLIC_PLAYGROUND_URL ?? "/playground",
} as const;
