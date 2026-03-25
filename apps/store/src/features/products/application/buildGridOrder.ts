import type { Product } from "@/features/products/domain/types";

/**
 * Builds a pool of regular (non-featured) items that can be pulled forward
 * from their original positions to fill orphan rows.
 */
function createRegularPool(products: Product[]) {
  const indices: number[] = [];
  for (const [i, p] of products.entries()) {
    if (!p.featured) indices.push(i);
  }

  let ptr = 0;
  const consumed = new Set<number>();

  return {
    consumed,
    pull(): Product | null {
      while (ptr < indices.length) {
        const idx = indices[ptr++];
        if (!consumed.has(idx)) {
          consumed.add(idx);
          return products[idx];
        }
      }
      return null;
    },
  };
}

/** Pull up to `needed` regulars from the pool into the result array. */
function fillRow(
  pool: ReturnType<typeof createRegularPool>,
  result: Product[],
  needed: number,
): number {
  let pulled = 0;
  for (let i = 0; i < needed; i++) {
    const filler = pool.pull();
    if (!filler) break;
    result.push(filler);
    pulled++;
  }
  return pulled;
}

/**
 * Reorders products so no single regular item sits alone on a row before
 * a featured (col-span-full) card.
 *
 * When an orphan would occur (count % cols === 1), the algorithm pulls
 * regulars from after the featured item to **complete the row** — up to
 * `cols - 1` items.
 *
 * @param products - The product list (may include featured and regular)
 * @param cols     - Current column count (1, 2, or 3)
 */
export function buildGridOrder(products: Product[], cols: number): Product[] {
  if (products.length === 0 || cols <= 1) return products;

  const pool = createRegularPool(products);
  const result: Product[] = [];
  let rowCount = 0;

  for (const [i, product] of products.entries()) {
    if (product.featured) {
      if (rowCount % cols === 1) {
        fillRow(pool, result, cols - 1);
      }
      result.push(product);
      rowCount = 0;
      continue;
    }

    if (pool.consumed.has(i)) continue;

    pool.consumed.add(i);
    result.push(product);
    rowCount++;
  }

  return result;
}
