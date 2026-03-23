import { createLogger } from "shared/utils/logger";

import {
  environment,
  getRuntimeEnv,
} from "@/shared/infrastructure/config/environment";

export const logger = createLogger(() => ({
  isDevelopment: environment.isDevelopment,
  nodeEnv: getRuntimeEnv().nodeEnv,
  debug: getRuntimeEnv().debug,
  logLevel: getRuntimeEnv().logLevel,
}));
