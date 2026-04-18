export const COP_CURRENCY_CODE = "COP";

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: COP_CURRENCY_CODE,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCop(amount: number): string {
  return copFormatter.format(amount);
}
