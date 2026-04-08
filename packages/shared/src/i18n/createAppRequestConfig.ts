import { getRequestConfig } from "next-intl/server";

interface RoutingConfig {
  locales: readonly string[];
  defaultLocale: string;
}

export function createAppRequestConfig(
  routing: RoutingConfig,
  loadMessages: (
    locale: string,
  ) => Promise<{ default: Record<string, string> }>,
) {
  return getRequestConfig(async ({ requestLocale }) => {
    let locale = await requestLocale;

    if (
      !locale ||
      !routing.locales.includes(locale as (typeof routing.locales)[number])
    ) {
      locale = routing.defaultLocale;
    }

    return {
      locale,
      messages: (await loadMessages(locale)).default,
    };
  });
}
