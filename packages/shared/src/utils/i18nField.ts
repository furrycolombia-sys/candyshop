/**
 * Resolves an i18n field from a DB row with _en/_es suffixes.
 * Falls back to English if the locale field is missing.
 */
export function i18nField(
  obj: Record<string, unknown>,
  field: string,
  locale: string,
): string {
  return String(obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "");
}
