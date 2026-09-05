/**
 * Statement classification for the direct-Postgres query path.
 *
 * That path wraps SQL in `SELECT json_agg(...) FROM (<sql>)` so results come
 * back as JSON. That wrapper is only valid around a statement that returns
 * rows — wrapping a `TRUNCATE` is a syntax error.
 */

const ROW_RETURNING_KEYWORDS = new Set([
  "select",
  "with",
  "values",
  "table",
  "show",
  "explain",
]);

/** Removes leading whitespace and SQL comments so the first keyword is visible. */
function stripLeadingNoise(sql) {
  let rest = sql;
  let previous;

  do {
    previous = rest;
    rest = rest.trimStart();
    if (rest.startsWith("--")) {
      const newline = rest.indexOf("\n");
      rest = newline === -1 ? "" : rest.slice(newline + 1);
    } else if (rest.startsWith("/*")) {
      const close = rest.indexOf("*/");
      rest = close === -1 ? "" : rest.slice(close + 2);
    }
  } while (rest !== previous);

  return rest;
}

/**
 * Whether a statement returns rows, and so may be wrapped for JSON output.
 *
 * @param {string} sql A single SQL statement.
 * @returns {boolean}
 */
export function isRowReturningStatement(sql) {
  const [keyword = ""] = stripLeadingNoise(sql).split(/[\s(;]/, 1);
  return ROW_RETURNING_KEYWORDS.has(keyword.toLowerCase());
}
