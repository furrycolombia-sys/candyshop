export function sentryBaseOptions(app: string) {
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_TARGET_ENV ?? "local",
    release: process.env.NEXT_PUBLIC_BUILD_HASH,
    tracesSampleRate: 0,
    initialScope: { tags: { app } },
  };
}
