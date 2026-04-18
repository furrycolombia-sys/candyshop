const LOCALE_CURRENCY: Record<
  string,
  { field: "price_cop" | "price_usd"; currency: string; locale: string }
> = {
  en: { field: "price_usd", currency: "USD", locale: "en-US" },
  es: { field: "price_cop", currency: "COP", locale: "es-CO" },
};

function formatPrice(
  amount: number,
  config: { currency: string; locale: string },
): string {
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Returns the 3-letter currency code used for this product+locale combination.
 * Respects the same fallback logic as i18nPrice: if the locale's price is 0
 * but the other currency is non-zero, returns that currency's code.
 */
export function i18nCurrencyCode(
  product: { price_cop: number; price_usd: number },
  locale: string,
): string {
  const primary = LOCALE_CURRENCY[locale] ?? LOCALE_CURRENCY.en;
  if (product[primary.field] !== 0) return primary.currency;

  const fallbackKey = primary.field === "price_usd" ? "es" : "en";
  const fallback = LOCALE_CURRENCY[fallbackKey];
  if (product[fallback.field] !== 0) return fallback.currency;

  return primary.currency;
}

/**
 * Returns a locale-formatted price string with fallback logic:
 * - Both prices are 0 → show $0 in the locale's currency
 * - Locale's price is 0 but the other is non-zero → show the non-zero price in its own currency
 * - Both non-zero → show the locale's price (default behavior)
 */
export function i18nPrice(
  product: { price_cop: number; price_usd: number },
  locale: string,
): string {
  const primary = LOCALE_CURRENCY[locale] ?? LOCALE_CURRENCY.en;
  const primaryVal = product[primary.field];

  if (primaryVal !== 0) {
    return formatPrice(primaryVal, primary);
  }

  // Primary price is 0 — check if the other currency has a value
  const fallbackKey = primary.field === "price_usd" ? "es" : "en";
  const fallback = LOCALE_CURRENCY[fallbackKey];
  const fallbackVal = product[fallback.field];

  if (fallbackVal !== 0) {
    return formatPrice(fallbackVal, fallback);
  }

  return formatPrice(0, primary);
}
