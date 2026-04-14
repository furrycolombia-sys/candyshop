import { createAppRequestConfig } from "shared/i18n/createAppRequestConfig";
import { createAppRouting } from "shared/i18n/createAppRouting";

const routing = createAppRouting();

export default createAppRequestConfig(
  routing,
  (locale) =>
    import(`../../../shared/infrastructure/i18n/messages/${locale}.json`),
);
