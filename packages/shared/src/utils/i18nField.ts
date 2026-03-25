/**
 * Resolves an i18n field from a DB row with _en/_es suffixes.
 * Falls back to English if the locale field is missing.
 */
export function i18nField(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any DB row or JSONB object
  obj: Record<string, any> | null | undefined,
  field: string,
  locale: string,
): string {
  if (!obj) return "";
  return String(obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "");
}
