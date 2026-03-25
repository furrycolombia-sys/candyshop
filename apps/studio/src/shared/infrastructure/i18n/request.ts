import { getRequestConfig } from "next-intl/server";

import { routing } from ".";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (
      await import(
        `../../../shared/infrastructure/i18n/messages/${locale}.json`
      )
    ).default,
  };
});
