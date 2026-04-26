import * as Sentry from "@sentry/nextjs";
import { sentryBaseOptions } from "shared";

Sentry.init(sentryBaseOptions("playground"));
