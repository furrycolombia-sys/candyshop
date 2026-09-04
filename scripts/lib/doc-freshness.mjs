/**
 * Flags exported symbols whose implementation changed while their TSDoc did not.
 *
 * A heuristic by nature. No tool can see that prose went stale: change
 * `fetchAssignedOrders` from "returns null when missing" to "throws" without
 * touching the signature and every linter reports green. It is adopted
 * deliberately, because AI-driven development churns code faster than comments,
 * and a stale comment is a confident, wrong instruction.
 *
 * Two properties keep it from becoming noise people learn to ignore:
 *
 * - It reports **per symbol**, so the message names `fetchAssignedOrders`
 *   rather than a filename.
 * - It **collapses whitespace runs** before comparing, so re-indenting and
 *   re-wrapping cannot trigger it. It is not fully format-invariant: adding a
 *   space after a comma is still a change. That is tolerable because
 *   `format:check` gates the whole repo, so both sides of any comparison are
 *   already Prettier-formatted, and a reflow that survives that is one the
 *   code caused.
 *
 * There is no suppression flag, by choice: a suppression flag becomes the thing
 * everyone types. The way past it is to touch the doc -- restating an invariant
 * that still holds is itself worth writing.
 *
 * Ported from the sibling AeleOS repository with one deliberate change, which
 * `findStale` documents.
 */
import ts from "typescript";

/**
 * Collapses runs of whitespace so that reformatting cannot register as a
 * change.
 *
 * @param value - the source or comment text to normalise.
 * @returns the text with all whitespace runs collapsed to single spaces.
 */
const normalise = (value) => value.replace(/\s+/g, " ").trim();

/**
 * The doc comment immediately above a node.
 *
 * @param node - the AST node to look above.
 * @param source - the parsed source file the node belongs to.
 * @returns the block comment text, or an empty string when there is none.
 */
function leadingDoc(node, source) {
  const ranges = ts.getLeadingCommentRanges(source.text, node.pos) ?? [];
  return ranges
    .filter((r) => source.text.slice(r.pos, r.pos + 3) === "/**")
    .map((r) => source.text.slice(r.pos, r.end))
    .join("\n");
}

/**
 * Whether a node carries the `export` keyword.
 *
 * @param node - the AST node to inspect.
 * @returns true when the node is exported.
 */
const isExported = (node) =>
  node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

/**
 * The declared name of a top-level node.
 *
 * @param node - the AST node to name.
 * @returns the identifier, or null for nodes that do not declare one.
 */
function nameOf(node) {
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations[0]?.name?.getText?.() ?? null;
  }
  return node.name?.getText?.() ?? null;
}

/**
 * Every exported top-level symbol, paired with its normalised implementation
 * and documentation.
 *
 * @param code - the file's source text.
 * @param fileName - the path, used only for TypeScript's diagnostics.
 * @returns a map of symbol name to its normalised code and doc text.
 */
export function extractSymbols(code, fileName) {
  const source = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
  );
  const out = new Map();
  source.forEachChild((node) => {
    if (!isExported(node)) return;
    const name = nameOf(node);
    if (!name) return;
    out.set(name, {
      code: normalise(node.getText(source)),
      doc: normalise(leadingDoc(node, source)),
    });
  });
  return out;
}

/**
 * Symbols present in both versions whose code moved while their doc stood
 * still.
 *
 * Added and deleted symbols are ignored: naming them here would report a
 * missing doc, which is a different complaint.
 *
 * A symbol undocumented in *both* versions is ignored too, and this is where
 * the check diverges from the AeleOS original. AeleOS enforces
 * `jsdoc/require-jsdoc`, so every export there carries a doc and comparing
 * `"" === ""` can only mean "the doc did not move". Libra documents about a
 * third of its exports. Without this rule the same comparison would fire on
 * every undocumented export anyone edited -- a documentation-coverage mandate
 * wearing a freshness check's name, and one nobody agreed to. Guarding the
 * docs that exist is the honest subset, and it widens on its own as coverage
 * grows.
 *
 * Deleting a doc while changing the code is reported as its own case. Strictly
 * read, the doc *did* move -- from something to nothing -- so the equality test
 * above lets it through. AeleOS can afford that because `jsdoc/require-jsdoc`
 * rejects the result anyway; here nothing would. Leaving it unguarded would
 * make "delete the doc" the suppression flag this check's header says it
 * deliberately does not offer.
 *
 * @param before - symbols extracted from the earlier version.
 * @param after - symbols extracted from the current version.
 * @returns one entry per stale symbol.
 */
export function findStale(before, after) {
  const stale = [];
  for (const [name, now] of after) {
    const then = before.get(name);
    if (!then) continue;
    if (then.code === now.code) continue;
    if (!then.doc && !now.doc) continue;
    if (then.doc === now.doc || !now.doc) stale.push({ name });
  }
  return stale;
}
