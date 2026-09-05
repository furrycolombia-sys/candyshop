/**
 * A component that declares an ARIA role carrying a value -- progressbar,
 * meter, slider -- must also have an accessible name, or a screen reader
 * announces the number with no idea what it measures (WCAG 4.1.2).
 *
 * Requiring it in the type makes that a compile error rather than something to
 * remember. Exactly one of the two attributes must be supplied: `aria-label`
 * for a name written inline, `aria-labelledby` when a visible element already
 * says it.
 */
// The two attribute names necessarily appear twice each: that repetition is
// what makes the union exclusive, so it is structure rather than a magic
// string that could be hoisted into a constant.
/* eslint-disable sonarjs/no-duplicate-string */
export type RequiredAccessibleName =
  | { "aria-label": string; "aria-labelledby"?: never }
  | { "aria-labelledby": string; "aria-label"?: never };
/* eslint-enable sonarjs/no-duplicate-string */
