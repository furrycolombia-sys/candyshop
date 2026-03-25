const LOCALE_CURRENCY: Record<
  string,
  { field: "price_cop" | "price_usd"; currency: string; locale: string }
> = {
  en: { field: "price_usd", currency: "USD", locale: "en-US" },
  es: { field: "price_cop", currency: "COP", locale: "es-CO" },
};

/**
 * Returns a locale-formatted price string.
 * en → price_usd formatted as USD, es → price_cop formatted as COP.
 */
export function i18nPrice(
  product: { price_cop: number; price_usd: number },
  locale: string,
): string {
  const config = LOCALE_CURRENCY[locale] ?? LOCALE_CURRENCY.en;
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    minimumFractionDigits: 0,
  }).format(product[config.field]);
}
