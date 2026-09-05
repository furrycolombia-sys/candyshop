/* eslint-disable i18next/no-literal-string -- PostgREST query operators, not user-facing text */
import { adminFetch, createRestPath } from "./adminRest";

/** An order line, as both report routes select it. */
export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  currency: string;
  products: { name_en: string } | null;
}

/** The buyer or seller behind an order. */
export interface UserProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

const ITEMS_SELECT =
  "id,order_id,product_id,quantity,unit_price,currency,products(name_en)";

/**
 * How many ids go into one `in.(...)` filter.
 *
 * The reports fetched every order's lines in a single request, so the URL grew
 * by 37 bytes per order and the gateway rejected it. Measured against this
 * project's own stack: 200 ids is 7,466 bytes and answers 200; 250 ids is
 * 9,316 bytes and answers **414 URI Too Long**. Both report routes cap their
 * order query at 10,000 rows, so they intended to serve fifty times what they
 * could, and any report covering more than roughly two hundred orders came
 * back as a 500.
 *
 * 100 keeps a batch near 3.9KB, which leaves room for the select list and the
 * rest of the query on the same line.
 */
const ID_BATCH_SIZE = 100;

/**
 * Splits ids into batches small enough for a URL.
 *
 * @param items - the ids to split.
 * @param size - the maximum batch length.
 * @returns batches in the original order, or none for an empty input.
 */
export function batchIds<T>(items: readonly T[], size = ID_BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

/**
 * The order lines for a set of orders, optionally narrowed to one product.
 *
 * @param orderIds - the orders whose lines are wanted.
 * @param productId - a product to filter to, or null for all.
 * @returns every matching line, across as many requests as the ids need.
 */
export async function fetchOrderItems(
  orderIds: readonly string[],
  productId: string | null,
): Promise<OrderItemRow[]> {
  const batches = batchIds(orderIds);
  const responses = await Promise.all(
    batches.map((batch) => {
      const itemsQuery: Record<string, string> = {
        select: ITEMS_SELECT,
        order_id: `in.(${batch.join(",")})`,
      };
      if (productId) {
        itemsQuery["product_id"] = `eq.${productId}`;
      }
      return adminFetch(createRestPath("order_items", itemsQuery));
    }),
  );

  const pages = await Promise.all(
    responses.map((response) => response.json() as Promise<OrderItemRow[]>),
  );
  return pages.flat();
}

/**
 * The profiles for a set of users, keyed by id.
 *
 * @param userIds - the users to look up.
 * @returns a map of id to profile; empty when no ids are given.
 */
export async function fetchProfileMap(
  userIds: readonly string[],
): Promise<Map<string, UserProfileRow>> {
  if (userIds.length === 0) return new Map();

  const responses = await Promise.all(
    batchIds(userIds).map((batch) =>
      adminFetch(
        createRestPath("user_profiles", {
          select: "id,email,display_name",
          id: `in.(${batch.join(",")})`,
        }),
      ),
    ),
  );

  const pages = await Promise.all(
    responses.map((response) => response.json() as Promise<UserProfileRow[]>),
  );
  return new Map(pages.flat().map((profile) => [profile.id, profile]));
}
