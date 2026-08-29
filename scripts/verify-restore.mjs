/**
 * Compares restored row counts against a backup manifest.
 *
 * A table missing from `actual` counts as zero rather than being skipped: a
 * table that failed to restore reports no count, and skipping it would turn a
 * total failure into a pass.
 */
export function compareCounts(manifestTables, actualCounts) {
  const mismatches = [];

  for (const [table, expected] of Object.entries(manifestTables)) {
    const actual = actualCounts[table] ?? 0;
    if (actual !== expected) mismatches.push({ table, expected, actual });
  }

  return { ok: mismatches.length === 0, mismatches };
}
