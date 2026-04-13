// eslint-disable-next-line no-restricted-imports -- relative import needed for cross-package typecheck compatibility
export {
  API_TIMEOUT,
  API_CANCEL_MESSAGE,
  DEFAULT_ERROR_MESSAGE,
  isTestEnvironment,
} from "../../shared/config";

/** Max characters before truncating error messages in logs */
export const ERROR_TRUNCATION_LENGTH = 200;
