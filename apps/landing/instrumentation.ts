export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// onRequestError captures unhandled server request errors; error boundaries call
// captureException for render errors. Sentry deduplicates if both fire for the same event.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
