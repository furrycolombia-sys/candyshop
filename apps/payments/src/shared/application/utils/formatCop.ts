/**
 * Formats a COP amount as a currency string (e.g. "$ 12.000 COP").
 * Uses Intl.NumberFormat so no literal currency code leaks into components.
 */
export const COP_CURRENCY_CODE = "COP";
const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: COP_CURRENCY_CODE,
  minimumFractionDigits: 0,
});
export function formatCop(amount: number): string {
  return copFormatter.format(amount);
}
