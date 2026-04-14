/**
 * Resolves an i18n field from a DB row with _en/_es suffixes.
 * Falls back to the other language if the requested locale is empty.
 * Priority: locale → en → es → ""
 */
export function i18nField(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any DB row or JSONB object
  obj: Record<string, any> | null | undefined,
  field: string,
  locale: string,
): string {
  if (!obj) return "";
  const localeVal = obj[`${field}_${locale}`];
  if (localeVal) return String(localeVal);
  // Fall back to whichever language has content
  return String(obj[`${field}_en`] || obj[`${field}_es`] || "");
}
