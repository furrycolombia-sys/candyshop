import { describe, it, expect } from "vitest";

import { buildGridOrder } from "@/features/products/application/buildGridOrder";
import type { Product } from "@/features/products/domain/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STUB: Omit<Product, "id" | "name" | "featured"> = {
  slug: "s",
  description: "",
  price: 10,
  currency: "USD",
  type: "merch",
  category: "merch",
  images: [],
  inStock: true,
  createdAt: "2025-01-01",
};

function r(id: string): Product {
  return { ...STUB, id, name: id, slug: id, featured: false };
}

function f(id: string): Product {
  return { ...STUB, id, name: id, slug: id, featured: true };
}

function ids(products: Product[]): string[] {
  return products.map((p) => p.id);
}

/** No single item alone before any featured card */
function assertNoOrphans(result: Product[], cols: number) {
  let count = 0;
  for (const product of result) {
    if (product.featured) {
      expect(count % cols).not.toBe(1);
      count = 0;
    } else {
      count++;
    }
  }
}

function assertSameProducts(input: Product[], output: Product[]) {
  expect(ids(output).sort()).toEqual(ids(input).sort());
}

function extractNum(id: string): number {
  return Number.parseInt(id.replaceAll(/\D/g, ""), 10);
}

function assertRegularOrder(result: Product[]) {
  const regularIds = ids(result.filter((p) => !p.featured));
  const sorted = [...regularIds].sort((a, b) => extractNum(a) - extractNum(b));
  expect(regularIds).toEqual(sorted);
}

// ---------------------------------------------------------------------------
// User-defined exact scenarios (3-col)
// ---------------------------------------------------------------------------

describe("buildGridOrder — exact scenarios (3-col)", () => {
  const COLS = 3;

  it("F1 R1 R2 R3 R4 F2 R5 → pulls R5 forward to complete the row", () => {
    const input = [
      f("F1"),
      r("R1"),
      r("R2"),
      r("R3"),
      r("R4"),
      f("F2"),
      r("R5"),
    ];
    const result = buildGridOrder(input, COLS);

    expect(ids(result)).toEqual(["F1", "R1", "R2", "R3", "R4", "R5", "F2"]);
  });

  it("F1 R1 R2 R3 R4 F2 F3 R5 R6 F4 R7 → fills row before F2, R7 stays in tail", () => {
    const input = [
      f("F1"),
      r("R1"),
      r("R2"),
      r("R3"),
      r("R4"),
      f("F2"),
      f("F3"),
      r("R5"),
      r("R6"),
      f("F4"),
      r("R7"),
    ];
    const result = buildGridOrder(input, COLS);

    // R5+R6 pulled forward to complete row before F2.
    // R7 is after F4 in original — stays in tail (no orphan to fix before F4).
    expect(ids(result)).toEqual([
      "F1",
      "R1",
      "R2",
      "R3",
      "R4",
      "R5",
      "R6",
      "F2",
      "F3",
      "F4",
      "R7",
    ]);
    assertNoOrphans(result, COLS);
  });
});

// ---------------------------------------------------------------------------
// User-defined exact scenarios (2-col)
// ---------------------------------------------------------------------------

describe("buildGridOrder — exact scenarios (2-col)", () => {
  const COLS = 2;

  it("F1 R1 R2 R3 F2 R4 → pulls R4 to pair with R3", () => {
    // R3 would be alone before F2 (3%2=1). Pull R4 to complete the row.
    const input = [f("F1"), r("R1"), r("R2"), r("R3"), f("F2"), r("R4")];
    const result = buildGridOrder(input, COLS);

    expect(ids(result)).toEqual(["F1", "R1", "R2", "R3", "R4", "F2"]);
  });

  it("R1 R2 R3 F1 R4 R5 F2 → pulls R4 to pair with R3", () => {
    // 3 regulars before F1: 3%2=1 → orphan. Pull R4 forward.
    const input = [
      r("R1"),
      r("R2"),
      r("R3"),
      f("F1"),
      r("R4"),
      r("R5"),
      f("F2"),
    ];
    const result = buildGridOrder(input, COLS);

    // R4 pulled forward to make [R1,R2] [R3,R4] then F1.
    // R5 alone before F2: 1%2=1 orphan, but no regulars after F2 to pull.
    expect(ids(result)).toEqual(["R1", "R2", "R3", "R4", "F1", "R5", "F2"]);
  });

  it("R1 F1 R2 R3 R4 R5 F2 → pulls R2 to pair with R1", () => {
    // 1 regular before F1: 1%2=1 → orphan. Pull R2.
    const input = [
      r("R1"),
      f("F1"),
      r("R2"),
      r("R3"),
      r("R4"),
      r("R5"),
      f("F2"),
    ];
    const result = buildGridOrder(input, COLS);

    // R2 pulled forward → [R1,R2] F1. Then R3,R4,R5 before F2: 3%2=1 orphan.
    // No regulars after F2 → can't fix.
    expect(ids(result)).toEqual(["R1", "R2", "F1", "R3", "R4", "R5", "F2"]);
  });

  it("F1 R1 R2 F2 R3 R4 F3 → no orphans, no reordering needed", () => {
    // 2 regulars before F2 (2%2=0), 2 before F3 (2%2=0). All good.
    const input = [
      f("F1"),
      r("R1"),
      r("R2"),
      f("F2"),
      r("R3"),
      r("R4"),
      f("F3"),
    ];
    const result = buildGridOrder(input, COLS);

    expect(ids(result)).toEqual(["F1", "R1", "R2", "F2", "R3", "R4", "F3"]);
    assertNoOrphans(result, COLS);
  });

  it("R1 F1 R2 F2 R3 F3 → pulls sibling for each orphan when available", () => {
    // Each featured has 1 regular before it (orphan).
    const input = [r("R1"), f("F1"), r("R2"), f("F2"), r("R3"), f("F3")];
    const result = buildGridOrder(input, COLS);

    // R1 before F1: 1%2=1 → pull R2 → [R1,R2] F1
    // R3 before F3 consumed? No, R2 already pulled. 0 before F2 → emit F2.
    // R3 before F3: 1%2=1 → no items after F3 to pull.
    expect(ids(result)).toEqual(["R1", "R2", "F1", "F2", "R3", "F3"]);
  });

  it("R1 R2 R3 R4 R5 F1 R6 → pulls R6 to complete the row", () => {
    // 5 regulars before F1: 5%2=1 → orphan. Pull R6.
    const input = [
      r("R1"),
      r("R2"),
      r("R3"),
      r("R4"),
      r("R5"),
      f("F1"),
      r("R6"),
    ];
    const result = buildGridOrder(input, COLS);

    expect(ids(result)).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "F1"]);
    assertNoOrphans(result, COLS);
  });
});

// ---------------------------------------------------------------------------
// Parametric tests (2-col and 3-col)
// ---------------------------------------------------------------------------

describe.each([
  { cols: 2, label: "sm (2-col)" },
  { cols: 3, label: "lg (3-col)" },
])("buildGridOrder — $label", ({ cols }) => {
  it("returns empty array unchanged", () => {
    expect(buildGridOrder([], cols)).toEqual([]);
  });

  it("returns a single regular item unchanged", () => {
    expect(ids(buildGridOrder([r("R1")], cols))).toEqual(["R1"]);
  });

  it("returns a single featured item unchanged", () => {
    expect(ids(buildGridOrder([f("F1")], cols))).toEqual(["F1"]);
  });

  it("preserves order when no featured items", () => {
    const input = [r("R1"), r("R2"), r("R3"), r("R4"), r("R5")];
    expect(ids(buildGridOrder(input, cols))).toEqual([
      "R1",
      "R2",
      "R3",
      "R4",
      "R5",
    ]);
  });

  it("preserves order when all featured", () => {
    const input = [f("F1"), f("F2"), f("F3")];
    expect(ids(buildGridOrder(input, cols))).toEqual(["F1", "F2", "F3"]);
  });

  it("no reorder when featured is at a row boundary", () => {
    const regulars = Array.from({ length: cols }, (_, i) => r(`R${i + 1}`));
    const input = [...regulars, f("F1")];
    const result = buildGridOrder(input, cols);

    expect(ids(result)).toEqual([...regulars.map((p) => p.id), "F1"]);
    assertNoOrphans(result, cols);
  });

  it("pulls items forward to resolve an orphan", () => {
    // 1 regular then featured, with regulars after to pull
    const after = Array.from({ length: cols }, (_, i) => r(`A${i + 1}`));
    const input = [r("R1"), f("F1"), ...after];
    const result = buildGridOrder(input, cols);

    expect(result.length).toBe(input.length);
    assertSameProducts(input, result);
    assertNoOrphans(result, cols);
  });

  it("handles featured at position 0", () => {
    const input = [f("F1"), r("R1"), r("R2")];
    const result = buildGridOrder(input, cols);

    assertSameProducts(input, result);
    assertNoOrphans(result, cols);
    expect(result[0].id).toBe("F1");
  });

  it("handles consecutive featured items", () => {
    const regulars = Array.from({ length: cols }, (_, i) => r(`R${i + 1}`));
    const input = [
      ...regulars,
      f("F1"),
      f("F2"),
      ...regulars.map((p) => r(`${p.id}b`)),
    ];
    const result = buildGridOrder(input, cols);

    expect(result.length).toBe(input.length);
    assertSameProducts(input, result);
    assertNoOrphans(result, cols);
  });

  it("preserves relative order of regular items", () => {
    const input = [
      r("R1"),
      f("F1"),
      r("R2"),
      r("R3"),
      r("R4"),
      f("F2"),
      r("R5"),
      r("R6"),
    ];
    const result = buildGridOrder(input, cols);
    expect(result.length).toBe(input.length);
    assertRegularOrder(result);
  });

  it("preserves relative order of featured items", () => {
    const input = [
      r("R1"),
      f("F1"),
      r("R2"),
      f("F2"),
      r("R3"),
      f("F3"),
      r("R4"),
      r("R5"),
      r("R6"),
    ];
    const result = buildGridOrder(input, cols);
    const featuredIds = ids(result.filter((p) => p.featured));

    expect(featuredIds).toEqual(["F1", "F2", "F3"]);
  });

  it("never duplicates or drops products", () => {
    const input = [
      f("F1"),
      r("R1"),
      f("F2"),
      f("F3"),
      r("R2"),
      r("R3"),
      f("F4"),
      r("R4"),
      r("R5"),
      r("R6"),
      r("R7"),
      f("F5"),
      r("R8"),
    ];
    const result = buildGridOrder(input, cols);
    expect(result.length).toBe(input.length);
    assertSameProducts(input, result);
  });

  it("is idempotent", () => {
    const input = [
      f("F1"),
      r("R1"),
      f("F2"),
      r("R2"),
      r("R3"),
      r("R4"),
      r("R5"),
      r("R6"),
    ];
    const first = buildGridOrder(input, cols);
    const second = buildGridOrder(first, cols);
    expect(ids(second)).toEqual(ids(first));
  });

  it("handles large dataset (100 products, featured every 4th)", () => {
    const input: Product[] = [];
    let rCount = 0;
    let fCount = 0;
    for (let i = 0; i < 100; i++) {
      input.push(i % 4 === 0 ? f(`F${++fCount}`) : r(`R${++rCount}`));
    }
    const result = buildGridOrder(input, cols);

    expect(result.length).toBe(input.length);
    assertSameProducts(input, result);
    assertNoOrphans(result, cols);
  });
});

describe("buildGridOrder — cols=1 (mobile)", () => {
  it("returns the original order (no reordering needed)", () => {
    const input = [r("R1"), f("F1"), r("R2"), f("F2"), r("R3")];
    expect(ids(buildGridOrder(input, 1))).toEqual([
      "R1",
      "F1",
      "R2",
      "F2",
      "R3",
    ]);
  });
});
