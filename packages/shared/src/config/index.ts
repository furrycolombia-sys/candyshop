// Shared configuration
// Environment, feature flags, and app URL constants

export {
  environment,
  featureFlags,
  runtimeEnv,
  getRuntimeEnv,
  getMockApiBaseUrl,
  getApiPrefix,
  buildMswApiUrl,
} from "./environment";
export { appUrls } from "./appUrls";
export {
  API_REFRESH_INTERVALS,
  API_DEFAULTS,
  orvalOptions,
  type PartialQueryOptions,
} from "./api";
