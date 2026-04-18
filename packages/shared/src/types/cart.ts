export interface CartCookieItem {
  id: string;
  quantity: number;
}

export function isCartCookieItem(value: unknown): value is CartCookieItem {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.quantity === "number" &&
    Number.isInteger(record.quantity) &&
    record.quantity > 0
  );
}

export function isCartCookieItems(value: unknown): value is CartCookieItem[] {
  return Array.isArray(value) && value.every((item) => isCartCookieItem(item));
}
