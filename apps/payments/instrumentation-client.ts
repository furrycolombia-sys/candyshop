import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions } from "shared";

Sentry.init({
  ...sentryBaseOptions("payments"),
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    // payments renders PII (order totals, payment method text) — mask all text for safety
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
});
