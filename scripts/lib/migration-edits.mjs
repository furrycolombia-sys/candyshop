/**
 * The rule behind scripts/check-migration-edits.mjs, kept separate so it can be
 * tested without a git repository to diff.
 */

export const MIGRATIONS_DIR = "supabase/migrations/";

/**
 * Migrations that may still be edited because no database has applied them.
 *
 * The baseline is here because production does not exist yet: it is rebuilt
 * from scratch on every reset, so editing it is still safe and still the right
 * way to change the schema. **Remove this entry when production is restored**
 * (docs/production-status.md) -- from that moment an edit to it is exactly the
 * silent drift the check exists to prevent.
 */
export const EDITABLE = new Set(["20260902120000_baseline.sql"]);

/**
 * Adding a file is the correct way to change the schema. Anything else --
 * modified, renamed, deleted -- rewrites history a database may already hold.
 *
 * @param {{status: string, path: string}[]} changes
 * @param {Set<string>} editable
 */
export function findOffenders(changes, editable = EDITABLE) {
  return changes.filter(
    (c) =>
      !c.status.startsWith("A") &&
      !editable.has(c.path.slice(MIGRATIONS_DIR.length)),
  );
}
