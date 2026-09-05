/* eslint-disable i18next/no-literal-string -- PostgREST query operators, not user-facing text */
import { ORDER_STATUS_SET } from "shared/constants/orders";
import { POPULAR_CURRENCIES_SET } from "shared/utils/currencies";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_LENGTH = 10;

function isValidIsoDate(value: string): boolean {
  return ISO_DATE_REGEX.test(value) && !Number.isNaN(Date.parse(value));
}

function isValidAmount(value: string): boolean {
  const num = Number.parseFloat(value);
  return !Number.isNaN(num) && num >= 0;
}

function addDateFilters(
  filters: Record<string, string>,
  and: string[],
  dateFrom: string | null,
  dateTo: string | null,
): void {
  const validFrom = dateFrom && isValidIsoDate(dateFrom) ? dateFrom : null;
  const validTo = dateTo && isValidIsoDate(dateTo) ? dateTo : null;
  if (validFrom && validTo) {
    const end = new Date(validTo);
    end.setDate(end.getDate() + 1);
    filters["created_at"] = `gte.${validFrom}`;
    and.push(`created_at.lt.${end.toISOString().slice(0, ISO_DATE_LENGTH)}`);
  } else if (validFrom) {
    filters["created_at"] = `gte.${validFrom}`;
  } else if (validTo) {
    const end = new Date(validTo);
    end.setDate(end.getDate() + 1);
    filters["created_at"] = `lt.${end.toISOString().slice(0, ISO_DATE_LENGTH)}`;
  }
}

function addAmountFilters(
  filters: Record<string, string>,
  and: string[],
  amountMin: string | null,
  amountMax: string | null,
): void {
  const validMin = amountMin && isValidAmount(amountMin) ? amountMin : null;
  const validMax = amountMax && isValidAmount(amountMax) ? amountMax : null;
  if (validMin && validMax) {
    filters["total"] = `gte.${validMin}`;
    and.push(`total.lte.${validMax}`);
  } else if (validMin) {
    filters["total"] = `gte.${validMin}`;
  } else if (validMax) {
    filters["total"] = `lte.${validMax}`;
  }
}

/**
 * Build the PostgREST filter map for an admin sales-report query.
 *
 * - status / currency are validated against canonical SSOT sets. Unknown
 *   values are silently dropped (the UI sends them, so drift here would
 *   surface as a 400 rather than empty results).
 * - sellerId / buyerId pass through unchanged — they're UUIDs from the
 *   admin's own select boxes, not free-form input.
 *
 * - a second upper bound cannot reuse the column key an object already holds,
 *   so date and amount ceilings go into a single `and=(a,b)` group. One group,
 *   not one per bound: PostgREST answers `and=(a),(b)` with the first group
 *   alone and drops the rest without erroring, which silently ignored the
 *   amount ceiling whenever a date range was also set.
 *
 * Used by both `/api/admin/reports/orders` (returns JSON) and
 * `/api/admin/reports/export` (returns XLSX). The filter shape is identical.
 */
export function buildAdminOrderFilters(
  searchParams: URLSearchParams,
): Record<string, string> {
  const filters: Record<string, string> = {};
  // Every extra upper bound goes in ONE `and=(...)` group. Emitting a group
  // each -- `and=(a),(b)` -- does not fail: PostgREST parses the first group
  // and SILENTLY DROPS the rest. Verified against the local PostgREST, where
  // `permissions?and=(key.like.orders*),(key.like.receipts*)` returns the five
  // orders.* keys while the single group `and=(key.like.orders*,key.like.
  // receipts*)` correctly returns none. So a report filtered by both a date
  // range and an amount range silently ignored the amount ceiling.
  const and: string[] = [];

  addDateFilters(
    filters,
    and,
    searchParams.get("dateFrom"),
    searchParams.get("dateTo"),
  );
  addAmountFilters(
    filters,
    and,
    searchParams.get("amountMin"),
    searchParams.get("amountMax"),
  );

  if (and.length > 0) {
    filters["and"] = `(${and.join(",")})`;
  }

  const status = searchParams.get("status");
  const sellerId = searchParams.get("sellerId");
  const buyerId = searchParams.get("buyerId");
  const currency = searchParams.get("currency");

  if (status && ORDER_STATUS_SET.has(status)) {
    filters["payment_status"] = `eq.${status}`;
  }
  if (sellerId) filters["seller_id"] = `eq.${sellerId}`;
  if (buyerId) filters["user_id"] = `eq.${buyerId}`;
  if (currency) {
    const normalized = currency.toUpperCase();
    if (POPULAR_CURRENCIES_SET.has(normalized)) {
      filters["currency"] = `eq.${normalized}`;
    }
  }

  return filters;
}
