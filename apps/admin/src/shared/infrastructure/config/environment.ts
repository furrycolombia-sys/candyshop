export {
  environment,
  featureFlags,
  getRuntimeEnv,
  getMockApiBaseUrl,
  getApiPrefix,
  buildMswApiUrl,
} from "shared/config/environment";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
