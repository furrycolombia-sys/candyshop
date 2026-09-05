/**
 * Restore ordering helpers.
 *
 * A backup is a set of per-table row dumps with no schema. Restoring it means
 * inserting rows in an order that satisfies the foreign keys: a parent row must
 * exist before a child row can reference it. The dump is named alphabetically,
 * which is not that order.
 */

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Builds the single statement that empties every table before a restore.
 *
 * One statement rather than one per table: truncating a parent partway through
 * a restore cascades away children that were already inserted.
 *
 * @param {string[]} tables Table names to empty.
 * @returns {string} A single `TRUNCATE` statement.
 */
export function buildTruncateStatement(tables) {
  for (const table of tables) {
    if (!SAFE_IDENTIFIER.test(table)) {
      throw new Error(`Unsafe SQL identifier in backup data: "${table}"`);
    }
  }

  const quoted = tables.map((table) => `"${table}"`).join(", ");
  return `TRUNCATE ${quoted} RESTART IDENTITY CASCADE`;
}

/**
 * Orders tables so that every parent is inserted before its children.
 *
 * @param {string[]} tables Table names to order.
 * @param {Array<[string, string]>} edges `[child, parent]` foreign-key pairs.
 * @returns {string[]} The same tables, parents first.
 */
export function topologicalTableOrder(tables, edges) {
  const known = new Set(tables);
  const parentsOf = new Map(tables.map((table) => [table, new Set()]));

  for (const [child, parent] of edges) {
    // Self-references (a tree's parent_id) impose no ordering between rows of
    // different tables, and edges pointing outside this set cannot be satisfied
    // by ordering anyway.
    if (child === parent) continue;
    if (!known.has(child) || !known.has(parent)) continue;
    parentsOf.get(child).add(parent);
  }

  const ordered = [];
  const placed = new Set();
  let remaining = [...tables];

  while (remaining.length > 0) {
    const ready = remaining.filter((table) =>
      [...parentsOf.get(table)].every((parent) => placed.has(parent)),
    );

    // A cycle: no table has all its parents placed. Ordering cannot resolve it,
    // so emit the rest in their existing order and let the caller's constraints
    // decide. Returning a partial list would silently drop tables.
    if (ready.length === 0) {
      ordered.push(...remaining);
      break;
    }

    for (const table of ready) {
      ordered.push(table);
      placed.add(table);
    }
    remaining = remaining.filter((table) => !placed.has(table));
  }

  return ordered;
}
