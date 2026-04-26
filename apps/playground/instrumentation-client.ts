import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions } from "shared";

Sentry.init({
  ...sentryBaseOptions("playground"),
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    // maskAllText: false is intentional — small community, replay data is low-risk
    Sentry.replayIntegration({
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: false,
    }),
  ],
});
